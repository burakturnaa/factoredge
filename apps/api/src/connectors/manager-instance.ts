import { ConnectorManager } from "./connector-manager.js";

/** Uygulama boyunca tek bir ConnectorManager — route'lar ve Socket.IO gateway'i bunu paylaşır. */
export const connectorManager = new ConnectorManager();
