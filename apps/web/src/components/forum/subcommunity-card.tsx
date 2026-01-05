"use client";

import Link from "next/link";
import type { Subcommunity } from "@/lib/forum-types";

interface SubcommunityCardProps {
  subcommunity: Subcommunity;
}

export function SubcommunityCard({ subcommunity }: SubcommunityCardProps) {
  const typeLabels = {
    PUBLIC: "Public",
    INVITE_ONLY: "Invite Only",
    PASSWORD_PROTECTED: "Password Protected"
  };

  const typeColors = {
    PUBLIC: "bg-green-100 text-green-700",
    INVITE_ONLY: "bg-yellow-100 text-yellow-700",
    PASSWORD_PROTECTED: "bg-purple-100 text-purple-700"
  };

  return (
    <Link href={`/c/${subcommunity.slug}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            {subcommunity.name}
          </h3>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${typeColors[subcommunity.type]}`}
          >
            {typeLabels[subcommunity.type]}
          </span>
        </div>

        {subcommunity.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {subcommunity.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>{subcommunity.memberCount} members</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            <span>{subcommunity.threadCount} threads</span>
          </div>
        </div>

        {subcommunity.membership && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs font-medium text-blue-600">
              You are a {subcommunity.membership.role}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
