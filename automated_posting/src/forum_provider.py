"""
Forum API Client for Bot Automation

This module provides a Python client for interacting with the forum's bot API.
It handles authentication, community/bot creation, and posting operations.
"""

import requests
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class BotAccount:
    """Represents a bot account"""
    id: str
    display_name: str
    email: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


@dataclass
class Community:
    """Represents a community"""
    id: str
    name: str
    slug: str
    invite_code: str
    password: Optional[str] = None


class ForumProviderError(Exception):
    """Base exception for forum provider errors"""
    pass


class AuthenticationError(ForumProviderError):
    """Authentication failed"""
    pass


class APIError(ForumProviderError):
    """API request failed"""
    def __init__(self, message: str, status_code: int, response_body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


class ForumProvider:
    """
    Forum API client for bot automation.

    Usage:
        provider = ForumProvider("https://api.example.com/api", "admin@example.com", "password")
        provider.login()

        # Create community with random name
        community = provider.create_community("INVITE_ONLY")

        # Create bots
        bots = provider.create_bots(10, community.id)

        # Post as a bot
        provider.submit_thread(bots[0].id, community.slug, "Hello!", "This is my first post")
    """

    def __init__(self, api_url: str, admin_email: str, admin_password: str):
        """
        Initialize the forum provider.

        Args:
            api_url: Base URL for the API (e.g., "https://api.example.com/api")
            admin_email: Admin account email
            admin_password: Admin account password
        """
        self.api_url = api_url.rstrip("/")
        self.admin_email = admin_email
        self.admin_password = admin_password
        self.admin_token: Optional[str] = None
        self.bot_tokens: Dict[str, str] = {}  # bot_id -> access_token
        self.session = requests.Session()

    def _make_request(
        self,
        method: str,
        endpoint: str,
        token: Optional[str] = None,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict:
        """Make an API request"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {"Content-Type": "application/json"}

        if token:
            headers["Authorization"] = f"Bearer {token}"
        elif self.admin_token:
            headers["Authorization"] = f"Bearer {self.admin_token}"

        try:
            response = self.session.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
                timeout=30
            )

            if response.status_code >= 400:
                try:
                    error_body = response.json()
                except:
                    error_body = response.text
                raise APIError(
                    f"API request failed: {response.status_code}",
                    response.status_code,
                    error_body
                )

            if response.status_code == 204:
                return {}

            return response.json()

        except requests.RequestException as e:
            raise ForumProviderError(f"Request failed: {e}")

    def login(self) -> None:
        """
        Authenticate as admin to get access token.
        Must be called before using admin endpoints.
        """
        try:
            response = self._make_request(
                "POST",
                "/auth/login",
                data={
                    "email": self.admin_email,
                    "password": self.admin_password
                }
            )
            self.admin_token = response["tokens"]["accessToken"]
            logger.info("Admin login successful")
        except APIError as e:
            raise AuthenticationError(f"Admin login failed: {e}")

    def create_community(
        self,
        community_type: str = "INVITE_ONLY",
        description: Optional[str] = None,
        name_style: Optional[str] = None
    ) -> Community:
        """
        Create a new community with auto-generated name.

        Args:
            community_type: One of "PUBLIC", "INVITE_ONLY", "PASSWORD_PROTECTED"
            description: Optional description
            name_style: Optional name generation style

        Returns:
            Community object with id, name, slug, and invite_code
        """
        data = {"type": community_type}
        if description:
            data["description"] = description
        if name_style:
            data["nameStyle"] = name_style

        response = self._make_request("POST", "/admin/communities", data=data)

        return Community(
            id=response["id"],
            name=response["name"],
            slug=response["slug"],
            invite_code=response["inviteCode"],
            password=response.get("password")
        )

    def create_bot(
        self,
        subcommunity_id: str,
        display_name: Optional[str] = None,
        avatar_config: Optional[Dict] = None
    ) -> BotAccount:
        """
        Create a single bot account.

        Args:
            subcommunity_id: ID of community to join
            display_name: Optional display name (auto-generated if not provided)
            avatar_config: Optional avatar configuration

        Returns:
            BotAccount object
        """
        data = {"subcommunityId": subcommunity_id}
        if display_name:
            data["displayName"] = display_name
        if avatar_config:
            data["avatarConfig"] = avatar_config

        response = self._make_request("POST", "/admin/bots", data=data)

        return BotAccount(
            id=response["id"],
            display_name=response["displayName"],
            email=response["email"]
        )

    def create_bots(
        self,
        count: int,
        subcommunity_id: str,
        avatar_rules: Optional[Dict] = None
    ) -> List[BotAccount]:
        """
        Create multiple bot accounts.

        Args:
            count: Number of bots to create (1-100)
            subcommunity_id: ID of community to join
            avatar_rules: Optional avatar distribution rules

        Returns:
            List of BotAccount objects
        """
        data = {
            "count": count,
            "subcommunityId": subcommunity_id
        }
        if avatar_rules:
            data["avatarRules"] = avatar_rules

        response = self._make_request("POST", "/admin/bots/batch", data=data)

        return [
            BotAccount(
                id=bot["id"],
                display_name=bot["displayName"],
                email=bot["email"],
                access_token=bot.get("accessToken"),
                refresh_token=bot.get("refreshToken")
            )
            for bot in response["bots"]
        ]

    def login_as_bot(self, bot_email: str, bot_password: str) -> str:
        """
        Login as a bot to get its access token.
        Note: Bots don't have passwords by default, this is for manual bot accounts.

        Returns:
            Access token for the bot
        """
        response = self._make_request(
            "POST",
            "/auth/login",
            data={
                "email": bot_email,
                "password": bot_password
            }
        )
        return response["tokens"]["accessToken"]

    def set_bot_token(self, bot_id: str, token: str) -> None:
        """
        Set the access token for a bot.
        Used when tokens are provided externally.
        """
        self.bot_tokens[bot_id] = token

    def submit_thread(
        self,
        bot_id: str,
        subcommunity_slug: str,
        title: str,
        content: str
    ) -> Dict:
        """
        Create a new thread as a bot.

        Args:
            bot_id: ID of the bot account
            subcommunity_slug: Slug of the community
            title: Thread title
            content: Thread content (first post)

        Returns:
            Dict with threadId, postId, etc.
        """
        token = self.bot_tokens.get(bot_id)
        if not token:
            raise ForumProviderError(f"No token found for bot {bot_id}")

        return self._make_request(
            "POST",
            "/bot/threads",
            token=token,
            data={
                "subcommunitySlug": subcommunity_slug,
                "title": title,
                "content": content
            }
        )

    def submit_reply(
        self,
        bot_id: str,
        thread_id: str,
        content: str,
        parent_post_id: Optional[str] = None
    ) -> Dict:
        """
        Create a reply as a bot.

        Args:
            bot_id: ID of the bot account
            thread_id: ID of the thread to reply to
            content: Reply content
            parent_post_id: Optional parent post for nested replies

        Returns:
            Dict with postId, etc.
        """
        token = self.bot_tokens.get(bot_id)
        if not token:
            raise ForumProviderError(f"No token found for bot {bot_id}")

        data = {
            "threadId": thread_id,
            "content": content
        }
        if parent_post_id:
            data["parentPostId"] = parent_post_id

        return self._make_request(
            "POST",
            "/bot/posts",
            token=token,
            data=data
        )

    def get_bot_stats(self, bot_id: str) -> Dict:
        """
        Get posting statistics for a bot.
        """
        token = self.bot_tokens.get(bot_id)
        if not token:
            raise ForumProviderError(f"No token found for bot {bot_id}")

        return self._make_request("GET", "/bot/stats", token=token)

    def save_state(self, filepath: str, state: Dict) -> None:
        """Save state to a JSON file"""
        with open(filepath, "w") as f:
            json.dump(state, f, indent=2)

    def load_state(self, filepath: str) -> Dict:
        """Load state from a JSON file"""
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
