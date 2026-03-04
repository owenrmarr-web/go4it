"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { EnvelopeIcon } from "@/components/Icons";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  sentAt: string | null;
  scheduledAt: string | null;
  recipientCount: number;
  openCount: number;
  clickCount: number;
  createdAt: string;
  list: { name: string };
  template: { name: string } | null;
}

const STATUS_TABS = ["All", "DRAFT", "SCHEDULED", "SENT", "CANCELLED"];

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data) => {
        setCampaigns(data);
        setLoading(false);
      });
  }, []);

  const filtered = campaigns.filter((c) => {
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusVariant = (status: string): "success" | "info" | "warning" | "error" | "neutral" => {
    const map: Record<string, "success" | "info" | "warning" | "error" | "neutral"> = {
      SENT: "success",
      SCHEDULED: "info",
      SENDING: "warning",
      DRAFT: "neutral",
      CANCELLED: "error",
    };
    return map[status] || "neutral";
  };

  if (loading) {
    return <div className="text-fg-muted p-8">Loading campaigns...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        action={
          <Button variant="primary" onClick={() => router.push("/campaigns/new")}>
            New Campaign
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search campaigns..."
        />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b border-edge overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              statusFilter === tab
                ? "border-accent text-accent-fg"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<EnvelopeIcon />}
          message={search || statusFilter !== "All" ? "No campaigns match your filters" : "No campaigns yet"}
          actionLabel="Create Campaign"
          onAction={() => router.push("/campaigns/new")}
        />
      ) : (
        <div className="bg-card rounded-xl border border-edge overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left p-3 text-fg-muted font-medium">Name</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Status</th>
                  <th className="text-left p-3 text-fg-muted font-medium">List</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Date</th>
                  <th className="text-right p-3 text-fg-muted font-medium">Recipients</th>
                  <th className="text-right p-3 text-fg-muted font-medium">Open %</th>
                  <th className="text-right p-3 text-fg-muted font-medium">Click %</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((campaign) => {
                  const openRate =
                    campaign.recipientCount > 0
                      ? ((campaign.openCount / campaign.recipientCount) * 100).toFixed(1)
                      : "—";
                  const clickRate =
                    campaign.recipientCount > 0
                      ? ((campaign.clickCount / campaign.recipientCount) * 100).toFixed(1)
                      : "—";
                  return (
                    <tr
                      key={campaign.id}
                      className="border-b border-edge hover:bg-hover transition-colors cursor-pointer"
                      onClick={() => router.push(`/campaigns/${campaign.id}`)}
                    >
                      <td className="p-3">
                        <Link href={`/campaigns/${campaign.id}`} className="font-medium text-fg hover:text-accent-fg">
                          {campaign.name}
                        </Link>
                      </td>
                      <td className="p-3">
                        <Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge>
                      </td>
                      <td className="p-3 text-fg-secondary">{campaign.list.name}</td>
                      <td className="p-3 text-fg-muted">
                        {campaign.sentAt
                          ? new Date(campaign.sentAt).toLocaleDateString()
                          : campaign.scheduledAt
                          ? new Date(campaign.scheduledAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="p-3 text-right text-fg-secondary">{campaign.recipientCount || "—"}</td>
                      <td className="p-3 text-right text-fg-secondary">{openRate}%</td>
                      <td className="p-3 text-right text-fg-secondary">{clickRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
