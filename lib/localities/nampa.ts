import { createEnerGovClient } from "@/lib/sources/energov";
import type { Locality } from "./types";

const energov = createEnerGovClient({
  baseUrl: "https://nampaid-energovpub.tylerhost.net",
  tenantId: 1,
  tenantName: "NampaIDProd",
});

export const nampa: Locality = {
  slug: "nampa",
  displayName: "Nampa",
  fullName: "Nampa, Idaho",
  portalUrl: "https://nampaid-energovpub.tylerhost.net/Apps/SelfService",
  energov,
  tracked: [
    {
      kind: "editorial",
      slug: "toll-brothers-amity-happy-valley",
      label: "Toll Brothers \u2014 500 homes at Amity & Happy Valley",
      blurb:
        "Neighborhood meeting March 24, 2026 \u00b7 137 acres \u00b7 detached single-family",
    },
    {
      kind: "energov-plan",
      planId: "08689c24-7eed-4d82-9ce1-019ff3aca272",
      planNumber: "ANN-00352-2026",
      label: "Elite Industrial \u2014 annexation at 4300 E Victory Rd",
      blurb: "Annexation (more than 1 acre) filed March 2026 \u00b7 In Review",
    },
  ],
  // meetingSources: [ ... ] — CivicEngage + new meeting portal, TBD
};
