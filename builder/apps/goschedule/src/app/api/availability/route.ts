import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";

// GET /api/availability — Public endpoint (no auth required)
// Query params: startDate, endDate, serviceId?, providerId?
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const serviceId = searchParams.get("serviceId") || undefined;
  const providerId = searchParams.get("providerId") || undefined;
  // Support comma-separated IDs for multi-select
  const serviceIds = serviceId?.includes(",") ? serviceId.split(",") : undefined;
  const providerIds = providerId?.includes(",") ? providerId.split(",") : undefined;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate query params are required" },
      { status: 400 }
    );
  }

  try {
    const slots = await getAvailableSlots({
      startDate,
      endDate,
      serviceId: serviceIds ? undefined : serviceId,
      providerId: providerIds ? undefined : providerId,
      serviceIds,
      providerIds,
    });

    return NextResponse.json(slots);
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
