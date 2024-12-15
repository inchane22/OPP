import express from "express";
import { type Server } from "http";

const viteConfig = {
  plugins: [],
  server: {
    middlewareMode: true
  },
  appType: 'custom'
};

export const setupVite = async (app: express.Express, server: Server) => {
  // Your setup code
};