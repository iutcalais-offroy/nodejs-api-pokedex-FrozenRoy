import { Router } from "express";
import { DecksController } from "../controller/decks.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const decksController = new DecksController();

router.post("/", authenticateToken, (req, res) => decksController.createDeck(req, res));
router.get("/mine", authenticateToken, (req, res) => decksController.getUserDecks(req, res));
router.get("/:id", authenticateToken, (req, res) => decksController.getDeckById(req, res));
router.patch("/:id", authenticateToken, (req, res) => decksController.patchDeck(req, res));
router.delete("/:id", authenticateToken, (req, res) => decksController.deleteDeck(req, res));

export { router as decksRouter };
