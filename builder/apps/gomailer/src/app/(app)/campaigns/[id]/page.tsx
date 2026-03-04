"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";

interface SendLog {
  id: string;
  subscriberEmail: string;
  subscriberName: string | null;
  status: string;
  sentAt: string;
  openedAt: string | null;
  clickedAt: string | null;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: string;
  sentAt: string | null;
  scheduledAt: string | null;
  recipientCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  list: { name: string };
  template: { name: string } | null;
  sendLogs: SendLog[];
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchCampaign = () => {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCampaign(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const handleSend = async () => {
    setSending(true);
    const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
    if (res.ok) {
      toast.success("Campaign sent successfully!");
      fetchCampaign();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to send campaign");
    }
    setSending(false);
  };

  const handleCancel = async () => {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    if (res.ok) {
      toast.success("Campaign cancelled");
      fetchCampaign();
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Campaign deleted");
      router.push("/campaigns");
    } else {
      toast.error("Failed to delete campaign");
    }
  };

  const statusVariant = (status: string): "success" | "info" | "warning" | "error" | "neutral" => {
    const map: Record<string, "success" | "info" | "warning" | "error" | "neutral"> = {
      SENT: "success",
      SCHEDULED: "info",
      SENDING: "warning",
      DRAFT: "neutral",
      CANCELLED: "error",
      DELIVERED: "success",
      OPENED: "info",
      CLICKED: "info",
      BOUNCED: "error",
      FAILED: "error",
    };
    return map[status] || "neutral";
  };

  if (loading || !campaign) {
    return <div className="text-fg-muted p-8">Loading campaign...</div>;
  }

  const openRate = campaign.recipientCount > 0 ? ((campaign.openCount / campaign.recipientCount) * 100).toFixed(1) : "0.0";
  const clickRate = campaign.recipientCount > 0 ? ((campaign.clickCount / campaign.recipientCount) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-fg">{campaign.name}</h1>
            <Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge>
          </div>
          <p className="text-fg-muted mt-1">
            {campaign.list.name}
            {campaign.template && <> &middot; Template: {campaign.template.name}</>}
          </p>
        </div>
        <div className="flex gap-2">
          {(campaign.status === "DRAFT" || campaign.status === "SCHEDULED") && (
            <>
              <Button variant="primary" onClick={handleSend} disabled={sending}>
                {sending ? "Sending..." : "Send Now"}
              </Button>
              <Button variant="secondary" onClick={() => router.push(`/campaigns/${id}/edit`)}>
                Edit
              </Button>
            </>
          )}
          {campaign.status === "SCHEDULED" && (
            <Button variant="danger" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          {(campaign.status === "DRAFT" || campaign.status === "SCHEDULED" || campaign.status === "CANCELLED") && (
            <Button variant="danger" onClick={() => setShowDelete(true)}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Content Preview */}
      <div className="bg-card rounded-xl border border-edge p-5">
        <h2 className="text-sm font-medium text-fg-muted mb-2">Email Content</h2>
        <div className="text-fg font-medium text-lg">{campaign.subject}</div>
        <div className="mt-3 text-fg-secondary whitespace-pre-wrap text-sm">
          {campaign.body}
        </div>
      </div>

      {/* Performance Stats (when SENT) */}
      {campaign.status === "SENT" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-edge p-4">
            <p className="text-sm text-fg-muted">Recipients</p>
            <p className="text-2xl font-bold text-fg">{campaign.recipientCount}</p>
          </div>
          <div className="bg-card rounded-xl border border-edge p-4">
            <p className="text-sm text-fg-muted">Opens</p>
            <p className="text-2xl font-bold text-fg">{campaign.openCount}</p>
            <p className="text-xs text-fg-dim">{openRate}%</p>
          </div>
          <div className="bg-card rounded-xl border border-edge p-4">
            <p className="text-sm text-fg-muted">Clicks</p>
            <p className="text-2xl font-bold text-fg">{campaign.clickCount}</p>
            <p className="text-xs text-fg-dim">{clickRate}%</p>
          </div>
          <div className="bg-card rounded-xl border border-edge p-4">
            <p className="text-sm text-fg-muted">Bounced</p>
            <p className="text-2xl font-bold text-fg">{campaign.bounceCount}</p>
          </div>
        </div>
      )}

      {/* Send Log Table */}
      {campaign.sendLogs.length > 0 && (
        <div className="bg-card rounded-xl border border-edge overflow-hidden">
          <div className="p-4 border-b border-edge">
            <h2 className="text-lg font-semibold text-fg">Send Log</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left p-3 text-fg-muted font-medium">Email</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Name</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Status</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Sent</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Opened</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Clicked</th>
                </tr>
              </thead>
              <tbody>
                {campaign.sendLogs.map((log) => (
                  <tr key={log.id} className="border-b border-edge">
                    <td className="p-3 text-fg">{log.subscriberEmail}</td>
                    <td className="p-3 text-fg-secondary">{log.subscriberName || "—"}</td>
                    <td className="p-3">
                      <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
                    </td>
                    <td className="p-3 text-fg-muted">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-fg-muted">
                      {log.openedAt ? new Date(log.openedAt).toLocaleString() : "—"}
                    </td>
                    <td className="p-3 text-fg-muted">
                      {log.clickedAt ? new Date(log.clickedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        message="Are you sure you want to delete this campaign? This cannot be undone."
        destructive
      />
    </div>
  );
}
