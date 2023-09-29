/** @odoo-module **/

import { startWebClient } from "@web/start";
import { WebClientSaas } from "./webclient/webclient";

/**
 * (WebClientSaas instead of WebClient)
 */

startWebClient(WebClientSaas);
