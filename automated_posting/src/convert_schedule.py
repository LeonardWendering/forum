#!/usr/bin/env python3
"""
Convert schedule.txt to schedule.csv format.

The text file format:
- Lines starting with "Day X:" indicate a new day and thread title
- Row "0" is the Researchers' thread-creating post (kind="self")
- Rows "1.", "2.", etc. are top-level comments to the thread
- Rows "1.1", "2.1" are replies to posts 1, 2
- Rows "1.1.1", "2.1.1" are nested replies

Output CSV format:
datetime,time,account,title,body,kind,reply_to,community
"""

import csv
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional

BASE_DIR = Path(__file__).parent.parent
SCHEDULES_DIR = BASE_DIR / "schedules"


def parse_schedule_text(text_content: str, start_date: str, community_slug: str) -> List[Dict]:
    """
    Parse the schedule text file and convert to CSV rows.

    Args:
        text_content: Content of the schedule.txt file
        start_date: Start date in YYYY-MM-DD format
        community_slug: Target community slug

    Returns:
        List of dicts representing CSV rows
    """
    rows = []
    lines = text_content.strip().split('\n')

    current_day = 0
    current_date = datetime.strptime(start_date, "%Y-%m-%d")
    current_title = ""
    base_time = 10  # Starting hour (10:00 AM)
    minute_offset = 0

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Skip empty lines
        if not line:
            i += 1
            continue

        # Check for day header (e.g., "Day 1: Neighborhood Reflections...")
        day_match = re.match(r'^Day\s+(\d+):\s*(.+)$', line, re.IGNORECASE)
        if day_match:
            current_day = int(day_match.group(1))
            current_title = day_match.group(2).strip()
            current_date = datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=current_day - 1)
            minute_offset = 0
            i += 1
            continue

        # Skip table headers (ID, Bot & Time, Comment)
        if line.startswith("ID") and "Bot" in line:
            i += 1
            continue

        # Parse content rows
        # Format: ID<tab>Account<tab>Content  OR  ID.<tab>Account<tab>Content
        # For Researchers (ID=0): 0<tab>Researchers<tab>content
        # For bots: 1.<tab>BotName<tab>content  or  1.1<tab>BotName<tab>content

        # Match patterns like: "0", "1.", "1.1", "1.1.1", etc.
        row_match = re.match(r'^(\d+(?:\.\d+)*)?\.?\t(.+?)\t(.*)$', line)
        if not row_match:
            # Try alternative format with spaces or different separators
            row_match = re.match(r'^(\d+(?:\.\d+)*)\.?\s+(.+?)\s{2,}(.*)$', line)

        if row_match:
            row_id = row_match.group(1) or "0"
            account = row_match.group(2).strip()
            content = row_match.group(3).strip()

            # Handle multi-line content (content may span multiple lines)
            j = i + 1
            while j < len(lines):
                next_line = lines[j]
                # Check if next line is a new row (starts with number or is a day header)
                if re.match(r'^\d+(?:\.\d+)*\.?\t', next_line) or \
                   re.match(r'^Day\s+\d+:', next_line, re.IGNORECASE) or \
                   re.match(r'^ID\t', next_line) or \
                   not next_line.strip():
                    break
                content += " " + next_line.strip()
                j += 1
            i = j - 1

            # Calculate time (spread posts throughout the day)
            hour = base_time + (minute_offset // 60)
            minute = minute_offset % 60
            time_str = f"{hour:02d}:{minute:02d}"
            minute_offset += 5  # 5 minutes between posts

            # Determine kind and reply_to
            if row_id == "0":
                kind = "self"
                reply_to = ""
            else:
                kind = "comment"
                # reply_to is the parent ID
                # "1" replies to thread (parent is "0")
                # "1.1" replies to "1"
                # "1.1.1" replies to "1.1"
                parts = row_id.split(".")
                if len(parts) == 1:
                    # Top-level comment, reply to "0" (the thread)
                    reply_to = "0"
                else:
                    # Nested reply, reply to parent
                    reply_to = ".".join(parts[:-1])

            # Clean up content
            content = content.strip()
            # Remove LLM placeholders
            content = re.sub(r'/LLM generated sentence/', '', content)
            content = content.strip()

            # Skip empty content
            if not content and kind != "self":
                i += 1
                continue

            rows.append({
                "datetime": current_date.strftime("%Y-%m-%d"),
                "time": time_str,
                "account": account,
                "title": current_title if kind == "self" else "",
                "body": content,
                "kind": kind,
                "reply_to": reply_to,
                "community": community_slug,
                "row_id": row_id  # Keep track for reference mapping
            })

        i += 1

    return rows


def convert_file(input_path: Path, output_path: Path, start_date: str, community_slug: str):
    """Convert a text schedule file to CSV format."""
    with open(input_path, "r", encoding="utf-8") as f:
        text_content = f.read()

    rows = parse_schedule_text(text_content, start_date, community_slug)

    # Remove row_id from output (it was just for debugging)
    for row in rows:
        del row["row_id"]

    with open(output_path, "w", encoding="utf-8", newline="") as f:
        fieldnames = ["datetime", "time", "account", "title", "body", "kind", "reply_to", "community"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Converted {len(rows)} rows to {output_path}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Convert schedule.txt to schedule.csv")
    parser.add_argument("--input", default="schedule.txt", help="Input text file name")
    parser.add_argument("--output", default="schedule.csv", help="Output CSV file name")
    parser.add_argument("--start-date", required=True, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--community", required=True, help="Target community slug")

    args = parser.parse_args()

    input_path = SCHEDULES_DIR / args.input
    output_path = SCHEDULES_DIR / args.output

    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    convert_file(input_path, output_path, args.start_date, args.community)


if __name__ == "__main__":
    main()
