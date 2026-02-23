import prisma from "@/lib/prisma";

export async function logActivity(params: {
  type: string;
  detail?: string;
  taskId?: string;
  projectId?: string;
  userId: string;
}) {
  return prisma.activity.create({ data: params });
}
