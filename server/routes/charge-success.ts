import { Router } from "express";
import { verifyPaymentAndGetOperation, completePendingOperation, getChargeLogs, getChargeStats, getPendingOperations } from "../middleware/real-charge";
import { getGalleryItem, insertGalleryItem } from "../db/gallery";
import { addToGallery } from "../services/autofill";
import { generateVehicle } from "../generation/vehicle-v6";
import { generateWeapon } from "../generation/weapon-v6";
import { generateCreature } from "../generation/creature-v6";

const router = Router();

router.get("/charge/complete", async (req, res) => {
  try {
    const { session_id, op } = req.query;

    if (!session_id || !op) {
      return res.status(400).json({ error: "Missing session_id or operation ID" });
    }

    const { verified, operation, error } = await verifyPaymentAndGetOperation(session_id as string);

    if (!verified || !operation) {
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}`;
      return res.redirect(`${baseUrl}/?tab=assets&error=${encodeURIComponent(error || 'Payment verification failed')}`);
    }

    let result: any = { success: true, charged: 0.50 };
    const { action, body, params } = operation;

    if (action.includes("fork") && params?.id) {
      const sourceItem = await getGalleryItem(params.id);
      if (!sourceItem) {
        completePendingOperation(operation.id);
        return res.status(404).json({ error: "Source item not found" });
      }

      const forkedItem = await insertGalleryItem({
        kind: sourceItem.kind,
        title: `${sourceItem.title} (Fork)`,
        tags: [...sourceItem.tags, "forked"],
        license: sourceItem.license,
        owner: operation.user,
        imageBase64: sourceItem.imageBase64,
        modelUrl: sourceItem.modelUrl,
        meta: {
          ...sourceItem.meta,
          forkedFrom: sourceItem.id,
          forkedAt: Date.now(),
          projectId: body?.projectId,
        }
      });

      result.fork = {
        id: forkedItem.id,
        sourceItemId: sourceItem.id,
        projectId: body?.projectId,
        user: operation.user,
        forkedAt: Date.now(),
      };
      result.item = forkedItem;
    } else if (action.includes("autofill/vehicle")) {
      const meta = await generateVehicle(body?.prompt || "default combat vehicle");
      const item = await addToGallery("vehicle", body?.title || "Generated Vehicle", meta, "cc0", "system");
      result.item = item;
    } else if (action.includes("autofill/weapon")) {
      const meta = await generateWeapon(body?.prompt || "default rifle");
      const item = await addToGallery("weapon", body?.title || "Generated Weapon", meta, "cc0", "system");
      result.item = item;
    } else if (action.includes("autofill/creature")) {
      const meta = await generateCreature(body?.prompt || "default creature");
      const item = await addToGallery("creature", body?.title || "Generated Creature", meta, "cc0", "system");
      result.item = item;
    }

    completePendingOperation(operation.id);

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}`;
    const itemId = result.item?.id || result.fork?.id || '';
    
    res.redirect(`${baseUrl}/?tab=assets&paid=true&itemId=${itemId}`);
  } catch (error: any) {
    console.error("[charge-complete] Error:", error);
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}`;
    res.redirect(`${baseUrl}/?tab=assets&error=${encodeURIComponent(error.message || 'Operation failed')}`);
  }
});

router.get("/charges/stats", (req, res) => {
  const stats = getChargeStats();
  res.json({ success: true, stats });
});

router.get("/charges/logs", (req, res) => {
  const logs = getChargeLogs();
  res.json({ success: true, count: logs.length, logs });
});

router.get("/charges/pending", (req, res) => {
  const pending = getPendingOperations();
  res.json({ success: true, count: pending.length, pending });
});

export default router;
