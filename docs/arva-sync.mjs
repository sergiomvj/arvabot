#!/usr/bin/env node
// ARVA — Sync Agents OpenClaw → Supabase
// POST /api/supabase/sync-agents (service_key auth)
// Upsert agents_cache + agent_status
// Run as cron or webhook from OpenClaw
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gcsikdrqomjnhzcqrcsu.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdjc2lrZHJxb21qbmh6Y3FyY3N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTg2Mzc3MiwiZXhwIjoyMDkxNDM5NzcyfQ.lqPSMYZbHZnchS9rStli1qGnsaW4U4_wc6IMyR6XSEI';
const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'https://dashboard.fbrapps.com';

async function syncAgents(orgSlug = 'facebrasil') {
  // 1. Fetch agents from OpenClaw
  const openclawRes = await fetch(`${OPENCLAW_API}/api/agents`, {
    headers: { 'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY || 'live'}` }
  });
  const { agents } = await openclawRes.json();

  // 2. Upsert Supabase
  for (const agent of agents) {
    await fetch(`${SUPABASE_URL}/rest/v1/agents_cache`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        organization_id: 'cbe3cee1-1340-4b02-bebd-41e1c2dd7913', // Facebrasil
        openclaw_id: agent.id,
        name: agent.name,
        role: agent.role,
        model: agent.model,
        color: agent.color,
        active: agent.active,
        skills: agent.skills || [],
        last_synced_at: new Date().toISOString()
      })
    });

    // Status
    await fetch(`${SUPABASE_URL}/rest/v1/agent_status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        organization_id: 'cbe3cee1-1340-4b02-bebd-41e1c2dd7913',
        openclaw_id: agent.id,
        status: agent.active ? 'online' : 'offline',
        tasks_pending: agent.tasks_pending || 0,
        updated_at: new Date().toISOString()
      })
    });
  }

  console.log(`Synced ${agents.length} agents to Supabase`);
}

syncAgents().catch(console.error);
