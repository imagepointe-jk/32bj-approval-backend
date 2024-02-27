import { OrganizationName } from "./sharedTypes";

export const SERVER_ERROR = "Server error.";

export const organizationSources: {
  webhookSource: string;
  organizationName: OrganizationName;
}[] = [
  {
    webhookSource: "https://imagepointewebstores.com/",
    organizationName: "32BJ",
  },
];

export const imagePointeArtist = {
  name: "Ron",
  email: "dev.ron.fox@gmail.com",
};

export const imagePointeEditor = {
  name: "Felix",
  email: "dev.felix.richards@gmail.com",
};

export const testApprover = {
  name: "Jennifer",
  email: "jennifer.hawkins@gmail.com",
};

export const organizationReleaser = {
  name: "Melvin",
  email: "dev.melvin.carpenter@gmail.com",
};

export const frontEndURL = "https://www.EXAMPLE-LINK.com";
