-- Consolidar todos os agentes na ARVA Tech (3c3d75f5-774d-4bd4-ab24-c6432fc019f5)
-- Deleta duplicatas antes de mover (se houver o mesmo openclaw_id na org de destino)
DELETE FROM agents_cache 
WHERE organization_id != '3c3d75f5-774d-4bd4-ab24-c6432fc019f5'
AND openclaw_id IN (
  SELECT openclaw_id FROM agents_cache WHERE organization_id = '3c3d75f5-774d-4bd4-ab24-c6432fc019f5'
);

DELETE FROM agent_status 
WHERE organization_id != '3c3d75f5-774d-4bd4-ab24-c6432fc019f5'
AND openclaw_id IN (
  SELECT openclaw_id FROM agent_status WHERE organization_id = '3c3d75f5-774d-4bd4-ab24-c6432fc019f5'
);

-- Agora move todos os restantes
UPDATE agents_cache SET organization_id = '3c3d75f5-774d-4bd4-ab24-c6432fc019f5' WHERE organization_id != '3c3d75f5-774d-4bd4-ab24-c6432fc019f5';
UPDATE agent_status SET organization_id = '3c3d75f5-774d-4bd4-ab24-c6432fc019f5' WHERE organization_id != '3c3d75f5-774d-4bd4-ab24-c6432fc019f5';
UPDATE agent_threads SET organization_id = '3c3d75f5-774d-4bd4-ab24-c6432fc019f5' WHERE organization_id != '3c3d75f5-774d-4bd4-ab24-c6432fc019f5';
