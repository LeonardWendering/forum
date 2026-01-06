#!/usr/bin/env python3
"""
Forum Bot Automation - Main Entry Point

Usage:
    python -m src.main --init-forum       # Initialize communities and bots
    python -m src.main run-once           # Run scheduled posts for today
    python -m src.main watch              # Watch mode: check every minute, post when due
    python -m src.main --status           # Show current status
"""

import argparse
import csv
import json
import logging
import os
import random
import sys
from datetime import datetime, date
from pathlib import Path
from typing import Dict, List, Optional
import time

import yaml

from .forum_provider import ForumProvider, BotAccount, Community, ForumProviderError

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).parent.parent
CONFIG_DIR = BASE_DIR / "config"
STATE_DIR = BASE_DIR / "state"
SCHEDULES_DIR = BASE_DIR / "schedules"


def load_config(config_name: str) -> Dict:
    """Load a YAML config file"""
    config_path = CONFIG_DIR / f"{config_name}.yaml"
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def load_state() -> Dict:
    """Load the forum state"""
    state_path = STATE_DIR / "forum_setup.json"
    if state_path.exists():
        with open(state_path, "r") as f:
            return json.load(f)
    return {}


def save_state(state: Dict) -> None:
    """Save the forum state"""
    state_path = STATE_DIR / "forum_setup.json"
    with open(state_path, "w") as f:
        json.dump(state, f, indent=2)


def log_post(post_data: Dict) -> None:
    """Append a posted entry to the log"""
    log_path = STATE_DIR / "posted_log.jsonl"
    with open(log_path, "a") as f:
        f.write(json.dumps(post_data) + "\n")


def init_forum(provider: ForumProvider, config: Dict) -> None:
    """
    Initialize the forum with communities and bots.

    Creates communities with random names and populates them with bot accounts.
    """
    logger.info("Initializing forum setup...")
    provider.login()

    state = load_state()
    if "communities" not in state:
        state["communities"] = {}
    if "bots" not in state:
        state["bots"] = {}
    if "account_mapping" not in state:
        state["account_mapping"] = {}

    communities_config = config.get("communities", [])

    for i, comm_config in enumerate(communities_config):
        if not comm_config.get("active", True):
            continue

        comm_key = f"community_{i}"
        if comm_key in state["communities"]:
            logger.info(f"Community {comm_key} already exists, skipping...")
            continue

        # Create community
        name_style = comm_config.get("name_style", "nature")
        comm_type = comm_config.get("type", "INVITE_ONLY")
        description = comm_config.get("description")

        logger.info(f"Creating community with style={name_style}, type={comm_type}")
        community = provider.create_community(
            community_type=comm_type,
            description=description,
            name_style=name_style
        )
        logger.info(f"Created community: {community.name} ({community.slug})")

        state["communities"][comm_key] = {
            "id": community.id,
            "name": community.name,
            "slug": community.slug,
            "invite_code": community.invite_code,
            "password": community.password
        }
        save_state(state)

        # Create bots for this community
        bot_count = comm_config.get("bot_count", 10)
        avatar_rules = comm_config.get("avatar_rules")

        logger.info(f"Creating {bot_count} bots for {community.name}...")
        bots = provider.create_bots(
            count=bot_count,
            subcommunity_id=community.id,
            avatar_rules=avatar_rules
        )

        # Initialize bot_tokens if not present
        if "bot_tokens" not in state:
            state["bot_tokens"] = {}

        for j, bot in enumerate(bots):
            bot_key = f"{comm_key}_bot_{j}"
            state["bots"][bot_key] = {
                "id": bot.id,
                "display_name": bot.display_name,
                "email": bot.email,
                "community_id": community.id,
                "community_slug": community.slug
            }
            # Map persona names to bot IDs (for schedule CSV)
            state["account_mapping"][bot.display_name] = bot.id
            # Store bot tokens for posting
            if bot.access_token:
                state["bot_tokens"][bot.id] = bot.access_token

        save_state(state)
        logger.info(f"Created {len(bots)} bots")

    logger.info("Forum initialization complete!")
    logger.info(f"State saved to {STATE_DIR / 'forum_setup.json'}")


def run_schedule(provider: ForumProvider, config: Dict, schedule_file: str) -> None:
    """
    Run scheduled posts from a CSV file.

    CSV format:
        datetime,time,account,title,body,kind,reply_to,community

    - datetime: Date in YYYY-MM-DD format
    - time: Time in HH:MM format
    - account: Bot persona name (maps to bot ID via account_mapping)
    - title: Thread title (for new threads)
    - body: Post content
    - kind: "self" for new thread, "comment" for reply
    - reply_to: Hierarchical reference (0, 1, 1.1, 2.1.1, etc.)
    - community: Community slug (optional, uses default if not specified)
    """
    logger.info(f"Running schedule from {schedule_file}")
    provider.login()

    state = load_state()
    if not state.get("bots"):
        logger.error("No bots found. Run --init-forum first.")
        return

    # Load schedule
    schedule_path = SCHEDULES_DIR / schedule_file
    if not schedule_path.exists():
        logger.error(f"Schedule file not found: {schedule_path}")
        return

    today = date.today().isoformat()
    sleep_between = config.get("sleep_between_posts_seconds", 3)

    # Track created posts for reply_to references
    post_refs: Dict[str, str] = {}  # reply_to reference -> post_id

    with open(schedule_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            # Filter by today's date
            if row.get("datetime") != today:
                continue

            account_name = row.get("account", "").strip()
            title = row.get("title", "").strip()
            body = row.get("body", "").strip()
            kind = row.get("kind", "self").strip()
            reply_to = row.get("reply_to", "").strip()
            community_slug = row.get("community", "").strip()

            # Map account name to bot ID
            bot_id = state.get("account_mapping", {}).get(account_name)
            if not bot_id:
                logger.warning(f"Unknown account: {account_name}, skipping...")
                continue

            # Get bot token (need to implement token retrieval)
            # For now, we'd need to login as the bot or use admin impersonation
            bot_token = state.get("bot_tokens", {}).get(bot_id)
            if not bot_token:
                logger.warning(f"No token for bot {account_name}, skipping...")
                continue

            provider.set_bot_token(bot_id, bot_token)

            # Get community slug from bot if not specified
            if not community_slug:
                bot_info = state["bots"].get(f"community_0_bot_0")  # Default
                if bot_info:
                    community_slug = bot_info.get("community_slug")

            try:
                if kind == "self":
                    # Create new thread
                    result = provider.submit_thread(
                        bot_id=bot_id,
                        subcommunity_slug=community_slug,
                        title=title,
                        content=body
                    )
                    logger.info(f"Created thread: {title[:50]}... by {account_name}")

                    # Store reference for replies
                    ref_key = str(len(post_refs))
                    post_refs[ref_key] = result["threadId"]

                    log_post({
                        "timestamp": datetime.now().isoformat(),
                        "type": "thread",
                        "account": account_name,
                        "thread_id": result["threadId"],
                        "post_id": result["postId"]
                    })

                elif kind == "comment":
                    # Create reply
                    # Parse reply_to to get thread and parent post
                    thread_id = post_refs.get(reply_to.split(".")[0])
                    parent_id = post_refs.get(reply_to) if "." in reply_to else None

                    if not thread_id:
                        logger.warning(f"Invalid reply_to reference: {reply_to}")
                        continue

                    result = provider.submit_reply(
                        bot_id=bot_id,
                        thread_id=thread_id,
                        content=body,
                        parent_post_id=parent_id
                    )
                    logger.info(f"Created reply by {account_name}")

                    # Store reference
                    post_refs[reply_to] = result["postId"]

                    log_post({
                        "timestamp": datetime.now().isoformat(),
                        "type": "comment",
                        "account": account_name,
                        "thread_id": thread_id,
                        "post_id": result["postId"],
                        "parent_id": parent_id
                    })

                time.sleep(sleep_between)

            except ForumProviderError as e:
                logger.error(f"Failed to post: {e}")
                continue

    logger.info("Schedule run complete!")


def load_schedule_rows(schedule_file: str) -> List[Dict]:
    """Load all rows from a schedule CSV file"""
    schedule_path = SCHEDULES_DIR / schedule_file
    if not schedule_path.exists():
        logger.error(f"Schedule file not found: {schedule_path}")
        return []

    rows = []
    with open(schedule_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def run_watch(provider: ForumProvider, config: Dict, schedule_file: str) -> None:
    """
    Watch mode: continuously check for scheduled posts and execute them.

    Runs every minute, checks for posts due at the current time,
    executes them in random order with random delays (2-7 seconds).
    """
    logger.info(f"Starting watch mode for schedule: {schedule_file}")
    logger.info("Press Ctrl+C to stop")
    provider.login()

    state = load_state()
    if not state.get("bots"):
        logger.error("No bots found. Run --init-forum first.")
        return

    # Track which posts have been executed (by row index + date/time)
    executed_posts = set()

    # Track created posts for reply_to references (persists across minutes)
    post_refs: Dict[str, str] = {}

    try:
        while True:
            now = datetime.now()
            current_date = now.strftime("%Y-%m-%d")
            current_time = now.strftime("%H:%M")

            logger.info(f"[{current_date} {current_time}] Checking for scheduled posts...")

            # Load schedule fresh each time (allows live updates)
            rows = load_schedule_rows(schedule_file)

            # Find posts due now
            due_posts = []
            for idx, row in enumerate(rows):
                row_date = row.get("datetime", "").strip()
                row_time = row.get("time", "").strip()

                # Check if this post is due now and hasn't been executed
                post_key = f"{idx}:{row_date}:{row_time}"
                if row_date == current_date and row_time == current_time and post_key not in executed_posts:
                    due_posts.append((idx, row, post_key))

            if due_posts:
                logger.info(f"Found {len(due_posts)} posts to execute")

                # Randomize order
                random.shuffle(due_posts)

                for idx, row, post_key in due_posts:
                    account_name = row.get("account", "").strip()
                    title = row.get("title", "").strip()
                    body = row.get("body", "").strip()
                    kind = row.get("kind", "self").strip()
                    reply_to = row.get("reply_to", "").strip()
                    community_slug = row.get("community", "").strip()

                    # Map account name to bot ID
                    bot_id = state.get("account_mapping", {}).get(account_name)
                    if not bot_id:
                        logger.warning(f"Unknown account: {account_name}, skipping...")
                        executed_posts.add(post_key)
                        continue

                    # Get bot token
                    bot_token = state.get("bot_tokens", {}).get(bot_id)
                    if not bot_token:
                        logger.warning(f"No token for bot {account_name}, skipping...")
                        executed_posts.add(post_key)
                        continue

                    provider.set_bot_token(bot_id, bot_token)

                    # Get community slug from bot if not specified
                    if not community_slug:
                        for bot_key, bot_info in state["bots"].items():
                            if bot_info.get("id") == bot_id:
                                community_slug = bot_info.get("community_slug")
                                break

                    try:
                        if kind == "self":
                            # Create new thread
                            result = provider.submit_thread(
                                bot_id=bot_id,
                                subcommunity_slug=community_slug,
                                title=title,
                                content=body
                            )
                            logger.info(f"Created thread: {title[:50]}... by {account_name}")

                            # Store reference for replies using row index
                            ref_key = str(idx)
                            post_refs[ref_key] = result["threadId"]

                            log_post({
                                "timestamp": datetime.now().isoformat(),
                                "type": "thread",
                                "account": account_name,
                                "thread_id": result["threadId"],
                                "post_id": result["postId"]
                            })

                        elif kind == "comment":
                            # Create reply
                            # Parse reply_to to get thread reference
                            thread_ref = reply_to.split(".")[0]
                            thread_id = post_refs.get(thread_ref)
                            parent_id = post_refs.get(reply_to) if "." in reply_to else None

                            if not thread_id:
                                logger.warning(f"Invalid reply_to reference: {reply_to} (thread not found)")
                                executed_posts.add(post_key)
                                continue

                            result = provider.submit_reply(
                                bot_id=bot_id,
                                thread_id=thread_id,
                                content=body,
                                parent_post_id=parent_id
                            )
                            logger.info(f"Created reply by {account_name}")

                            # Store reference
                            post_refs[reply_to] = result["postId"]

                            log_post({
                                "timestamp": datetime.now().isoformat(),
                                "type": "comment",
                                "account": account_name,
                                "thread_id": thread_id,
                                "post_id": result["postId"],
                                "parent_id": parent_id
                            })

                        executed_posts.add(post_key)

                        # Random delay 2-7 seconds between posts
                        if len(due_posts) > 1:
                            delay = random.uniform(2, 7)
                            logger.info(f"Waiting {delay:.1f}s before next post...")
                            time.sleep(delay)

                    except ForumProviderError as e:
                        logger.error(f"Failed to post: {e}")
                        executed_posts.add(post_key)
                        continue

            else:
                logger.info("No posts due at this time")

            # Wait until the next minute
            now = datetime.now()
            seconds_until_next_minute = 60 - now.second
            logger.info(f"Sleeping {seconds_until_next_minute}s until next check...")
            time.sleep(seconds_until_next_minute)

    except KeyboardInterrupt:
        logger.info("\nWatch mode stopped by user")
        logger.info(f"Total posts executed this session: {len(executed_posts)}")


def show_status() -> None:
    """Show current forum setup status"""
    state = load_state()

    if not state:
        print("No forum setup found. Run --init-forum first.")
        return

    print("\n=== Forum Setup Status ===\n")

    communities = state.get("communities", {})
    print(f"Communities: {len(communities)}")
    for key, comm in communities.items():
        print(f"  - {comm['name']} ({comm['slug']})")
        print(f"    Invite code: {comm['invite_code']}")

    bots = state.get("bots", {})
    print(f"\nBots: {len(bots)}")

    # Group by community
    by_community: Dict[str, List] = {}
    for key, bot in bots.items():
        comm_slug = bot.get("community_slug", "unknown")
        if comm_slug not in by_community:
            by_community[comm_slug] = []
        by_community[comm_slug].append(bot["display_name"])

    for comm_slug, bot_names in by_community.items():
        print(f"  {comm_slug}: {len(bot_names)} bots")
        for name in bot_names[:5]:
            print(f"    - {name}")
        if len(bot_names) > 5:
            print(f"    ... and {len(bot_names) - 5} more")

    # Check for posted log
    log_path = STATE_DIR / "posted_log.jsonl"
    if log_path.exists():
        with open(log_path, "r") as f:
            posts = [json.loads(line) for line in f if line.strip()]
        print(f"\nPosted: {len(posts)} entries")


def main():
    parser = argparse.ArgumentParser(description="Forum Bot Automation")
    parser.add_argument("--init-forum", action="store_true", help="Initialize communities and bots")
    parser.add_argument("--status", action="store_true", help="Show current status")
    parser.add_argument("command", nargs="?", help="Command to run (run-once, watch)")
    parser.add_argument("--schedule", default="schedule.csv", help="Schedule file name")
    parser.add_argument("--config", default="forum_app", help="Config file name (without .yaml)")

    args = parser.parse_args()

    if args.status:
        show_status()
        return

    # Load config
    try:
        config = load_config(args.config)
    except FileNotFoundError as e:
        logger.error(str(e))
        sys.exit(1)

    # Create provider
    provider = ForumProvider(
        api_url=config.get("api_url", "http://localhost:3000/api"),
        admin_email=config.get("admin_email", ""),
        admin_password=os.environ.get("FORUM_ADMIN_PASSWORD", config.get("admin_password", ""))
    )

    if args.init_forum:
        communities_config = load_config("communities")
        init_forum(provider, communities_config)

    elif args.command == "run-once":
        run_schedule(provider, config, args.schedule)

    elif args.command == "watch":
        run_watch(provider, config, args.schedule)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
