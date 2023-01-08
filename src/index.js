const docusign = require("docusign-esign");
const fs = require("fs");
let apiClient = new docusign.ApiClient();
require("dotenv").config();

const client_id = process.env.CLIENT_ID;
const user_id = process.env.USER_ID;
const account_id = process.env.ACCOUNT_ID;
rsaKey = fs.readFileSync("./privatekay.key");
apiClient.setBasePath(process.env.URL_DEMO);
apiClient.setOAuthBasePath("account-d.docusign.com");

const args = {
  envelopeArgs: {
    signerName: "Teste",
    signerEmail: "",
    ccName: "teste 1",
    ccEmail: "",
    status: "sent",
  },
  accountId: process.env.ACCOUNT_ID,
};

const jwtLifeSec = 10 * 60;

apiClient
  .requestJWTUserToken(client_id, user_id, "signature", rsaKey, jwtLifeSec)
  .then(async (results) => {
    const accessToken = results.body.access_token;

    apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);

    let envelopesApi = new docusign.EnvelopesApi(apiClient);
    let envelope = makeEnvelope(args.envelopeArgs);

    // Call Envelopes::create API method
    // Exceptions will be caught by the calling function
    results = await envelopesApi.createEnvelope(args.accountId, {
      envelopeDefinition: envelope,
    });
    let envelopeId = results.envelopeId;

    console.log(`Envelope was created. EnvelopeId ${envelopeId}`);
    return { envelopeId: envelopeId };
  });

function makeEnvelope(args) {
  let doc3PdfBytes = fs.readFileSync("World_Wide_Corp_lorem.pdf");

  let env = new docusign.EnvelopeDefinition();
  env.emailSubject = "Por favor, assine este conjunto de documentos";

  let doc1 = new docusign.Document(),
    doc3b64 = Buffer.from(doc3PdfBytes).toString("base64");

  let doc3 = new docusign.Document.constructFromObject({
    documentBase64: doc3b64,
    name: "Computador portátil de uso funcional",
    fileExtension: "pdf",
    documentId: "1",
  });

  env.documents = [doc3];

  let signer1 = docusign.Signer.constructFromObject({
    email: args.signerEmail,
    name: args.signerName,
    recipientId: "1",
    routingOrder: "1",
  });

  let cc1 = new docusign.CarbonCopy();
  cc1.email = args.ccEmail;
  cc1.name = args.ccName;
  cc1.routingOrder = "2";
  cc1.recipientId = "2";

  let signHere1 = docusign.SignHere.constructFromObject({
      anchorString: "Assinatura",
      anchorYOffset: "10",
      anchorUnits: "pixels",
      anchorXOffset: "70",
    }),
    signHere2 = docusign.SignHere.constructFromObject({
      anchorString: "/sn1/",
      anchorYOffset: "10",
      anchorUnits: "pixels",
      anchorXOffset: "70",
    });
  let signer1Tabs = docusign.Tabs.constructFromObject({
    signHereTabs: [signHere1, signHere2],
  });
  signer1.tabs = signer1Tabs;

  let recipients = docusign.Recipients.constructFromObject({
    signers: [signer1],
    carbonCopies: [cc1],
  });
  env.recipients = recipients;

  env.status = args.status;
  return env;
}
