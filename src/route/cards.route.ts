import { Router } from "express";
import { cardsController } from "../controller/cards.controller";

export const cardsRouter = Router();
cardsRouter.get("/", cardsController.getCards);