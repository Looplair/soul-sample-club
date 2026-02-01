"use client";

import { useState } from "react";
import { Vote, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui";

interface VoteBringBackProps {
  packId: string;
  initialHasVoted: boolean;
  initialVoteCount: number;
  isLoggedIn: boolean;
}

export function VoteBringBack({
  packId,
  initialHasVoted,
  initialVoteCount,
  isLoggedIn,
}: VoteBringBackProps) {
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async () => {
    if (!isLoggedIn) return;
    setIsLoading(true);

    try {
      if (hasVoted) {
        await fetch("/api/vote", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packId }),
        });
        setHasVoted(false);
        setVoteCount((prev) => Math.max(0, prev - 1));
      } else {
        await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packId }),
        });
        setHasVoted(true);
        setVoteCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Vote error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-grey-800/50 border border-grey-700 rounded-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Vote className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-body text-white font-medium">
              Want this pack back?
            </p>
            <p className="text-body-sm text-text-muted mt-1">
              Vote to bring this release back. If enough people vote, we&apos;ll make it available again.
            </p>
          </div>
        </div>
        {isLoggedIn ? (
          <Button
            variant={hasVoted ? "secondary" : "primary"}
            size="sm"
            onClick={handleVote}
            isLoading={isLoading}
            leftIcon={
              hasVoted ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Vote className="w-4 h-4" />
              )
            }
            className="flex-shrink-0"
          >
            {hasVoted ? "Voted" : "Vote to bring back"}
          </Button>
        ) : (
          <a href="/login">
            <Button variant="secondary" size="sm" leftIcon={<Vote className="w-4 h-4" />}>
              Sign in to vote
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
