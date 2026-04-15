export async function dispatchToOpenClawSprint(prisma: any, projectId: string) {
  console.log(`[TaskCenter] Dispatching project ${projectId} to OpenClaw...`);
  return { dispatched: true, projectId };
}
