import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/Acer/Downloads/AquaGas_ Sprint Backlog.xlsx";
const outputDir = "C:/xampp/htdocs/aquagas1/outputs/aquagas-backlog-20260920";
const outputPath = `${outputDir}/AquaGas_Product_and_Sprint_Backlog.xlsx`;
const previewDir = "C:/xampp/htdocs/aquagas1/.tmp-aquagas-backlog/previews-after";

const backlog = [
  ["PB-01","Accounts & Security","Register and log in","As a household user, I want to register and log in to the platform, so that I can securely place and track my orders.","High",5,"Sprint 1","Done","1) Sign-up captures name, email, contact number, password, and address.\n2) A confirmation email must be completed before first sign-in.\n3) Valid credentials open the customer area; invalid credentials show a clear error.","Registration, email confirmation, login, Google sign-in, and password recovery routes"],
  ["PB-02","Supplier Discovery","Browse nearby suppliers","As a household user, I want to browse nearby water and LPG suppliers, so that I can choose one that fits my needs and location.","High",8,"Sprint 1","Done","1) Only active, approved suppliers with map coordinates are shown.\n2) Results within 15 km are sorted nearest-first.\n3) Cards show service type, open status, rating, delivery fee, and delivery time.","Customer home, location selection, 15 km Haversine filter, provider cards"],
  ["PB-03","Ordering","Place an order","As a household user, I want to place an order with the correct products, quantities, and delivery address, so that I receive exactly what I need.","High",8,"Sprint 1","Done","1) Checkout requires cart items, contact details, address, and a pinned delivery location.\n2) The saved order contains item quantities, totals, supplier, and delivery details.\n3) Success creates a reference number, clears the cart, and shows the order in My Orders.","Cart, checkout, address picker, order insert, order list"],
  ["PB-04","Payments","Choose a payment method","As a household user, I want cash on delivery and QR Ph payment options, so that I can pay conveniently.","High",8,"Sprint 1","Done","1) Checkout offers Cash on Delivery and QR Ph.\n2) QR Ph orders begin as pending payment and are hidden from providers until confirmed.\n3) Payment method and Pending/Paid/Unpaid status appear on the order.","Checkout payment selector, PayMongo create route and webhook"],
  ["PB-05","Order Tracking","Track order progress","As a household user, I want to track my order status in real time, so that I know when to expect delivery.","High",8,"Sprint 1","Done","1) Tracking displays placed, confirmed, pickup, preparation, out-for-delivery, and delivered stages.\n2) Provider status updates appear without a manual refresh.\n3) The estimated delivery time is visible when supplied.","Customer order detail, status stepper, realtime subscription, provider updates"],
  ["PB-06","Trust & Reviews","Rate and review a supplier","As a household user, I want to rate and review a supplier after delivery, so that I can share feedback and help other users choose.","Low",5,"Sprint 3","Done","1) Only a delivered order can be reviewed.\n2) A 1–5 star rating is required and a comment is optional.\n3) One review is allowed per order and the supplier average and count update.","Delivered-order review form and supplier rating display"],
  ["PB-07","Supplier Catalog","Manage stock and pricing","As a supplier, I want to manage product availability and pricing, so that customers see accurate information.","High",8,"Sprint 1","Done","1) A supplier can add, edit, hide/show, and delete water or LPG products.\n2) Each product stores name, category, size, price, stock/availability, and optional image.\n3) Customer catalog changes after a successful save.","Provider products page and product image storage"],
  ["PB-08","Order Fulfillment","Accept or reject orders","As a supplier, I want to receive and accept or reject incoming orders, so that I only commit to orders I can fulfill.","High",8,"Sprint 1","Done","1) New paid/COD orders appear in the provider queue.\n2) Valid next actions include confirmation or cancellation with a reason.\n3) The customer sees the updated order state in real time.","Provider order queue, detail actions, status validation"],
  ["PB-09","Supplier Governance","Onboard and verify suppliers","As an administrator, I want to onboard and verify new suppliers, so that only legitimate suppliers operate on the platform.","Medium",8,"Sprint 1","Done","1) Admin can create or review a supplier record and supporting document link.\n2) Admin can activate, reject, or suspend a supplier.\n3) Only active suppliers appear in customer search.","Admin provider management and approval_status filtering"],
  ["PB-10","Administration","Monitor platform activity","As an administrator, I want a dashboard of orders, users, suppliers, and revenue, so that I can monitor performance.","Medium",8,"Sprint 1","Done","1) Dashboard shows total orders, customers, active suppliers, and revenue.\n2) Reports can be viewed for a selected period.\n3) Metrics exclude or identify cancelled orders consistently.","Admin dashboard and reports pages"],
  ["PB-11","Notifications","Receive order updates","As a household user, I want notifications about order updates, so that I stay informed without repeatedly checking the app.","Medium",5,"Sprint 6","Partial","1) In-app order state updates are visible in real time.\n2) Confirmation and out-for-delivery events trigger a visible in-app alert.\n3) Push, SMS, or email delivery is added before this story is marked Done.","Realtime UI exists; external push/SMS notification delivery is not evident"],
  ["PB-12","Accounts & Security","Protect personal and payment data","As a household user, I want my personal and payment information stored securely, so that it is protected from unauthorized access.","High",8,"Sprint 1","Done","1) Authentication is handled by Supabase and passwords are not stored in application tables.\n2) payment secrets remain server-side and webhook signatures are verified.\n3) role-based access and row-level policies restrict protected records; production uses HTTPS.","Supabase Auth/RLS, server payment routes, role guards"],
  ["PB-13","Ordering","View history and reorder","As a household user, I want to view my order history and reorder a previous purchase, so that repeat purchases are fast.","Medium",5,"Sprint 3","Done","1) Order history lists date, supplier, items, total, delivery type, payment, and status.\n2) Reorder reloads currently available products and quantities from the same supplier.\n3) Unavailable products are skipped with user feedback.","Customer orders list and reorder flow"],
  ["PB-14","Accounts & Security","Sign in with Google","As a user, I want to sign in with Google, so that I can access AquaGas without creating another password.","Medium",5,"Sprint 2","Done","1) Google OAuth can be started from login and registration.\n2) The callback creates or loads the profile.\n3) The user is routed according to customer or provider role.","Google OAuth callback and role-based redirect"],
  ["PB-15","Accounts & Security","Reset a forgotten password","As a user, I want to reset a forgotten password, so that I can regain account access.","High",3,"Sprint 2","Done","1) A reset link is sent to a valid email.\n2) The recovery callback opens the reset screen.\n3) The new password can be saved and used to log in.","Login forgot-password action and reset routes"],
  ["PB-16","Supplier Discovery","Filter by water or LPG","As a household user, I want to filter suppliers by service type, so that I can find water or LPG quickly.","Medium",3,"Sprint 2","Done","1) Water and LPG filters update results immediately.\n2) The filter preserves location constraints.\n3) An empty state explains when no supplier matches.","Customer home service filters"],
  ["PB-17","Ordering","Keep one supplier per cart","As a household user, I want the cart to contain products from one supplier, so that delivery and payment remain valid.","High",3,"Sprint 2","Done","1) Adding from a second supplier prompts for confirmation.\n2) Confirming clears the old cart before adding the new item.\n3) Cancelling leaves the existing cart unchanged.","Cart provider restriction"],
  ["PB-18","Ordering","Adjust cart quantities","As a household user, I want to change product quantities at checkout, so that I can correct my order before paying.","High",3,"Sprint 2","Done","1) Plus and minus controls update quantity and totals.\n2) Reducing quantity one prompts before removal.\n3) Quantity cannot exceed current availability rules.","Checkout quantity controls"],
  ["PB-19","Location & Maps","Pin a delivery location","As a household user, I want to pin my address on a map, so that the supplier can find the correct destination.","High",5,"Sprint 2","Done","1) Customer can click the map or use device location.\n2) Latitude and longitude are stored on the order.\n3) Locations outside the Philippines or supplier radius are rejected.","Leaflet address picker, GPS, coordinate validation"],
  ["PB-20","Location & Maps","Save delivery addresses","As a household user, I want to save categorized delivery addresses, so that I can reuse Home, Work, or other locations.","Medium",5,"Sprint 3","Done","1) Customer can save a label, address, and coordinates.\n2) Saved locations can be selected at checkout.\n3) Customer can add and delete saved locations from Profile.","Saved address chips and profile management"],
  ["PB-21","Delivery Options","Choose free batch delivery","As a household user, I want to choose an eligible scheduled batch slot, so that I can receive free delivery.","Medium",8,"Sprint 4","Done","1) Active future slots display their schedule and remaining eligibility.\n2) Slots past the cutoff cannot be selected.\n3) Batch orders store the slot and scheduled time and charge zero delivery fee.","Checkout batch delivery selector"],
  ["PB-22","Delivery Operations","Manage recurring delivery slots","As a supplier, I want to create and manage recurring delivery slots, so that I can group deliveries efficiently.","Medium",8,"Sprint 4","Done","1) Supplier can set weekday, time, capacity, cutoff, and active state.\n2) Paused slots are unavailable at checkout.\n3) Supplier can inspect and dispatch eligible slot orders together.","Provider slots page"],
  ["PB-23","Location & Maps","Navigate to the customer","As a supplier, I want to view the delivery point and open directions, so that I can reach the customer efficiently.","High",5,"Sprint 2","Done","1) Order details show the customer pin.\n2) Directions open in Google Maps.\n3) Active deliveries are also visible on a status-colored dashboard map.","Delivery map and provider orders map"],
  ["PB-24","Order Fulfillment","Set an estimated delivery time","As a supplier, I want to set an ETA, so that the customer knows when to expect the order.","Medium",3,"Sprint 2","Done","1) Supplier can save an ETA on an active order.\n2) The customer sees the latest ETA.\n3) Updating the ETA does not change order status.","Provider order ETA and customer order detail"],
  ["PB-25","Payments","Retry or cancel pending QR payment","As a household user, I want to retry or cancel an incomplete QR Ph payment, so that an expired payment session does not trap my order.","High",5,"Sprint 3","Done","1) Pending payment orders can request a new payment session.\n2) Unpaid orders can be cancelled.\n3) Paid orders cannot be cancelled by this action.","Pending-payment order controls"],
  ["PB-26","Supplier Catalog","Upload product photos","As a supplier, I want to upload product photos, so that customers can recognize items before ordering.","Low",5,"Sprint 3","Done","1) Supported images upload to product storage.\n2) The image appears on customer and supplier product views.\n3) A water/LPG fallback appears when no photo exists.","Product image upload and fallback"],
  ["PB-27","Order Fulfillment","Cancel eligible orders","As a household user, I want to cancel an eligible order, so that I can correct a purchase before fulfillment advances.","Medium",5,"Sprint 3","Done","1) COD orders can be cancelled only through the configured pickup cutoff.\n2) Pending QR orders can be cancelled before payment.\n3) The cancellation state and reason appear to both parties.","Customer cancellation rules"],
  ["PB-28","Communication","Message about an order","As a customer or supplier, I want to exchange messages within an order, so that delivery questions are resolved in context.","High",8,"Sprint 5","Done","1) Only order participants can read and send messages.\n2) New messages appear in real time with delivered/seen state and typing presence.\n3) Input closes after delivery or cancellation while history remains visible.","OrderChat component and realtime presence"],
  ["PB-29","Delivery Operations","Attach proof of delivery","As a supplier, I want to attach delivery evidence, so that completed orders have verifiable proof.","Medium",5,"Sprint 5","Done","1) A supplier can upload a proof image for a delivered order.\n2) The proof URL and delivered time are stored.\n3) The customer can view the proof on order details.","Order proof storage and order detail"],
  ["PB-30","Supplier Operations","Configure store details and hours","As a supplier, I want to maintain store details and automatic hours, so that published availability stays accurate.","High",5,"Sprint 2","Done","1) Supplier can edit contact, address, service type, delivery fee, and delivery time.\n2) Supplier can manually open/close the store.\n3) Optional opening and closing times automatically update availability.","Provider settings and auto schedule"],
  ["PB-31","Supplier Analytics","View revenue and order statistics","As a supplier, I want a performance dashboard, so that I can understand store activity.","Medium",5,"Sprint 5","Done","1) Dashboard shows current order and revenue totals.\n2) Revenue chart supports seven-day and thirty-day periods.\n3) Cancelled orders are excluded from revenue.","Provider dashboard"],
  ["PB-32","Supplier Operations","Export filtered orders","As a supplier, I want to export the filtered order list, so that I can analyze or archive it outside AquaGas.","Low",3,"Sprint 5","Done","1) Export uses the active status/search filter.\n2) CSV includes order ID, customer, status, payment, delivery, total, and date.\n3) Values are safely escaped.","Provider order CSV export"],
  ["PB-33","Accessibility & UX","Use light or dark theme","As a user, I want to switch themes, so that I can use the site comfortably in different environments.","Low",3,"Sprint 4","Done","1) A visible theme control switches light and dark modes.\n2) The selection persists between visits.\n3) Core customer screens remain readable in both themes.","Theme provider and navbar toggle"],
  ["PB-34","Reliability & Security","Handle inactivity and offline state","As a household user, I want clear inactivity and offline behavior, so that my session and expectations remain safe.","Medium",5,"Sprint 5","Done","1) A warning appears before session timeout.\n2) The user can continue or is signed out after inactivity.\n3) An offline banner appears on connectivity loss without erasing cached content.","SessionTimeout and OfflineBanner components"],
  ["PB-35","Assistance","Ask AquaBot for help","As a household user, I want an assistant that understands stores, products, and orders, so that I can get help quickly.","Low",8,"Sprint 5","Done","1) The assistant receives relevant live platform context.\n2) Responses use a supported Gemini fallback strategy.\n3) Supported browsers can dictate a message using en-PH speech recognition.","Customer AquaBot and chat API"],
  ["PB-36","Assistance","Use provider operations assistant","As a supplier, I want an assistant that can explain orders, products, and revenue, so that I can make faster decisions.","Low",8,"Sprint 5","Done","1) The assistant receives current provider context.\n2) Answers do not expose another supplier's data.\n3) A response can be played and stopped with text-to-speech.","ProviderBot and provider-chat API"],
  ["PB-37","Onboarding","Follow a provider tutorial","As a new supplier, I want an onboarding tutorial, so that I can learn the portal without separate training.","Low",3,"Sprint 5","Done","1) First visit presents the guided tutorial.\n2) Steps cover dashboard, orders, products, slots, and settings.\n3) Completion is remembered locally and the tutorial can be reopened.","ProviderTutorial component"],
  ["PB-38","Public Experience","Understand AquaGas before registering","As a visitor, I want clear public pages, so that I can evaluate the service and its policies.","Medium",5,"Sprint 4","Done","1) Landing and About pages explain water and LPG delivery.\n2) Terms, Privacy, and Changelog are publicly reachable.\n3) Calls to action lead to registration or login.","Public landing, About, Terms, Privacy, and Changelog pages"],
  ["PB-39","Mobile UX","Use responsive navigation","As a mobile household user, I want primary destinations within easy reach, so that I can browse, order, and track comfortably.","Medium",3,"Sprint 4","Done","1) Home, Cart, Orders, and Profile remain accessible on small screens.\n2) Cart count and selected destination are visible.\n3) Safe-area spacing prevents controls from being obscured.","Customer bottom navigation"],
  ["PB-40","Notifications","Receive external delivery alerts","As a household user, I want SMS or push alerts for confirmation and delivery events, so that I can stay informed when AquaGas is closed.","Medium",8,"Sprint 6","Not Started","1) The user can opt in and select an available channel.\n2) Confirmation and out-for-delivery/delivered events send once per transition.\n3) Failures are logged and do not block fulfillment.","Planned gap: README roadmap lists SMS notifications"],
];

const sprintItems = [
  ["PB-01","User Story","Register and log in",5,"High","Customer/Auth","Done","Email confirmation and secure role-aware sign-in work end to end."],
  ["PB-02","User Story","Browse nearby suppliers",8,"High","Customer UI","Done","Active approved suppliers within 15 km display nearest-first."],
  ["PB-03","User Story","Place an order",8,"High","Ordering","Done","Validated checkout creates the order, its items, and a reference number."],
  ["PB-04","User Story","Choose COD or QR Ph",8,"High","Payments","Done","COD and QR Ph persist correct payment and order states."],
  ["PB-05","User Story","Track order progress",8,"High","Realtime","Done","Customer tracking follows all fulfillment stages and shows ETA."],
  ["PB-07","User Story","Manage products",8,"High","Provider Portal","Done","Supplier can add, edit, show/hide, price, and remove products."],
  ["PB-08","User Story","Accept or reject orders",8,"High","Provider Portal","Done","Supplier queue and status actions update the customer view."],
  ["PB-09","User Story","Verify suppliers",8,"Medium","Admin Portal","Done","Admin approval controls whether a supplier appears publicly."],
  ["PB-10","User Story","Monitor activity",8,"Medium","Admin Portal","Done","Dashboard exposes core users, suppliers, orders, and revenue metrics."],
  ["PB-12","Security Story","Protect user and payment data",8,"High","Platform","Done","Auth, RLS, role guards, and server-side payment secrets are enforced."],
];

const tasks = [
  ["T-01","PB-01","Build registration fields and profile creation",8,"","Frontend + Backend","Done","Email confirmation page shown after sign-up"],
  ["T-02","PB-01","Implement login, Google OAuth, recovery, and role redirects",10,"","Auth","Done","Customer/provider routes resolve correctly"],
  ["T-03","PB-02","Query approved suppliers and calculate 15 km distance",10,"","Frontend + Data","Done","Only serviceable suppliers are listed nearest-first"],
  ["T-04","PB-03","Implement cart validation and order/item persistence",12,"","Ordering","Done","Successful checkout creates auditable records"],
  ["T-05","PB-04","Implement COD and server-side QR Ph flow",16,"","Payments","Done","Webhook promotes paid orders and rejects invalid events"],
  ["T-06","PB-05","Build status stepper, ETA, and realtime refresh",10,"","Realtime","Done","Customer view updates after provider action"],
  ["T-07","PB-07","Build supplier product CRUD and availability controls",12,"","Provider Portal","Done","Catalog edits are visible to customers"],
  ["T-08","PB-08","Build provider queue and valid status transitions",10,"","Provider Portal","Done","Accept/reject/status actions are constrained"],
  ["T-09","PB-09","Build supplier approval administration",10,"","Admin Portal","Done","Inactive suppliers remain hidden"],
  ["T-10","PB-10","Build admin KPIs and reports",10,"","Admin Portal","Done","Platform totals are visible and reconcilable"],
  ["T-11","PB-12","Apply RLS, route guards, and secret handling",12,"","Platform Security","Done","Unauthorized cross-role access is blocked"],
  ["T-12","All","Run responsive, permission, and end-to-end regression tests",12,"","QA","Done","Core customer/provider/admin paths pass"],
];

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const product = workbook.worksheets.getItem("Product Backlog");
const sprint = workbook.worksheets.getItem("Sprint Backlog");
for (const t of [...product.tables.items]) t.delete();
for (const t of [...sprint.tables.items]) t.delete();
product.getRange("A1:Z250").unmerge();
sprint.getRange("A1:Z250").unmerge();
product.getRange("A1:Z250").clear({ applyTo: "all" });
sprint.getRange("A1:Z250").clear({ applyTo: "all" });
const summary = workbook.worksheets.getOrAdd("Summary");
summary.getRange("A1:Z100").clear({ applyTo: "all" });
const evidence = workbook.worksheets.getOrAdd("Website Coverage");
evidence.getRange("A1:Z100").clear({ applyTo: "all" });

const navy = "#173A5E", blue = "#2474B5", aqua = "#0EA5A4", pale = "#EAF5FA", gold = "#F3B33D", green = "#DDF4E4", red = "#FDE2E2", gray = "#E9EEF3", ink = "#183246";
const titleFmt = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 18 }, verticalAlignment: "center" };
const headerFmt = { fill: blue, font: { bold: true, color: "#FFFFFF" }, verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#C8D5E1" } };
const sectionFmt = { fill: aqua, font: { bold: true, color: "#FFFFFF" }, verticalAlignment: "center" };

// Product Backlog
product.showGridLines = false;
product.getRange("A1:J1").merge();
product.getRange("A1").values = [["AQUAGAS PRODUCT BACKLOG — ALIGNED TO CURRENT WEBSITE"]];
product.getRange("A1:J1").format = titleFmt;
product.getRange("A2:J2").merge();
product.getRange("A2").values = [["PB-01 to PB-13 preserve the requested scope; PB-14 onward captures additional capabilities found in the current AquaGas codebase."]];
product.getRange("A2:J2").format = { fill: pale, font: { color: ink, italic: true }, wrapText: true };
const productHeaders = [["ID","Epic","User Story Title","User Story","Priority","Story Points","Target Sprint","Current Status","Acceptance Criteria","Current Website Evidence"]];
product.getRange("A4:J4").values = productHeaders;
product.getRange("A4:J4").format = headerFmt;
product.getRange(`A5:J${4+backlog.length}`).values = backlog;
const productData = product.getRange(`A5:J${4+backlog.length}`);
productData.format = { font: { color: ink, size: 10 }, verticalAlignment: "top", wrapText: true, borders: { insideHorizontal: { style: "thin", color: "#D7E0E8" } } };
product.getRange(`A5:A${4+backlog.length}`).format.font = { bold: true, color: navy };
product.getRange(`E5:H${4+backlog.length}`).format.horizontalAlignment = "center";
product.getRange(`F5:F${4+backlog.length}`).format.numberFormat = "0";
product.getRange("A:A").format.columnWidth = 10;
product.getRange("B:B").format.columnWidth = 22;
product.getRange("C:C").format.columnWidth = 26;
product.getRange("D:D").format.columnWidth = 52;
product.getRange("E:E").format.columnWidth = 12;
product.getRange("F:F").format.columnWidth = 12;
product.getRange("G:G").format.columnWidth = 13;
product.getRange("H:H").format.columnWidth = 16;
product.getRange("I:I").format.columnWidth = 58;
product.getRange("J:J").format.columnWidth = 46;
product.getRange("1:1").format.rowHeight = 30;
product.getRange("2:2").format.rowHeight = 32;
product.getRange("4:4").format.rowHeight = 32;
product.getRange(`5:${4+backlog.length}`).format.rowHeight = 92;
product.freezePanes.freezeRows(4);
product.getRange(`E5:E${4+backlog.length}`).dataValidation = { rule: { type: "list", values: ["High","Medium","Low"] } };
product.getRange(`G5:G${4+backlog.length}`).dataValidation = { rule: { type: "list", values: ["Sprint 1","Sprint 2","Sprint 3","Sprint 4","Sprint 5","Sprint 6","Future"] } };
product.getRange(`H5:H${4+backlog.length}`).dataValidation = { rule: { type: "list", values: ["Not Started","In Progress","Partial","Done"] } };
product.getRange(`E5:E${4+backlog.length}`).conditionalFormats.add("containsText", { text: "High", format: { fill: red, font: { color: "#9B1C1C", bold: true } } });
product.getRange(`E5:E${4+backlog.length}`).conditionalFormats.add("containsText", { text: "Medium", format: { fill: "#FFF1C7", font: { color: "#8A5A00" } } });
product.getRange(`E5:E${4+backlog.length}`).conditionalFormats.add("containsText", { text: "Low", format: { fill: "#DDF5F4", font: { color: "#176B68" } } });
product.getRange(`H5:H${4+backlog.length}`).conditionalFormats.add("containsText", { text: "Done", format: { fill: green, font: { color: "#176B3A", bold: true } } });
product.getRange(`H5:H${4+backlog.length}`).conditionalFormats.add("containsText", { text: "Partial", format: { fill: "#FFF1C7", font: { color: "#8A5A00", bold: true } } });
product.getRange(`H5:H${4+backlog.length}`).conditionalFormats.add("containsText", { text: "Not Started", format: { fill: gray, font: { color: "#4B5563" } } });
const productTable = product.tables.add(`A4:J${4+backlog.length}`, true, "AquaGasProductBacklog");
productTable.style = "TableStyleMedium2";
productTable.showFilterButton = true;

// Sprint Backlog
sprint.showGridLines = false;
sprint.getRange("A1:H1").merge();
sprint.getRange("A1").values = [["AQUAGAS SPRINT 1 BACKLOG — CORE ORDERING & OPERATIONS"]];
sprint.getRange("A1:H1").format = titleFmt;
sprint.getRange("A2:H2").merge();
sprint.getRange("A2").values = [["Sprint goal: Deliver a secure end-to-end flow from account creation and supplier discovery through ordering, payment, fulfillment, and administration."]];
sprint.getRange("A2:H2").format = { fill: pale, font: { color: ink, bold: true }, wrapText: true };
sprint.getRange("A4:B8").values = [["Sprint","Sprint 1"],["Proposed Start",new Date("2026-09-21T00:00:00")],["Proposed End",new Date("2026-10-02T00:00:00")],["Capacity (points)",80],["Committed Points",null]];
sprint.getRange("B8").formulas = [["=SUM(D12:D21)"]];
sprint.getRange("A4:A8").format = { fill: navy, font: { bold: true, color: "#FFFFFF" } };
sprint.getRange("B4:B8").format = { fill: pale, font: { bold: true, color: ink } };
sprint.getRange("B5:B6").format.numberFormat = "mmm d, yyyy";
sprint.getRange("H4:H9").format.fill = "#FFFFFF";
sprint.getRange("D4:E8").values = [["Metric","Value"],["Done points",null],["Incomplete points",null],["Completion",null],["Capacity variance",null]];
sprint.getRange("D4:E4").format = sectionFmt;
sprint.getRange("E5").formulas = [["=SUMIF(G12:G21,\"Done\",D12:D21)"]];
sprint.getRange("E6").formulas = [["=B8-E5"]];
sprint.getRange("E7").formulas = [["=IF(B8=0,0,E5/B8)"]];
sprint.getRange("E8").formulas = [["=B7-B8"]];
sprint.getRange("E7").format.numberFormat = "0%";
sprint.getRange("A11:H11").values = [["ID","Type","User Story Title","Story Points","Priority","Owner / Workstream","Status","Definition of Done"]];
sprint.getRange("A11:H11").format = headerFmt;
sprint.getRange("A12:H21").values = sprintItems;
sprint.getRange("A12:H21").format = { verticalAlignment: "top", wrapText: true, font: { color: ink }, borders: { insideHorizontal: { style: "thin", color: "#D7E0E8" } } };
sprint.getRange("A12:A21").format.font = { bold: true, color: navy };
sprint.getRange("D12:G21").format.horizontalAlignment = "center";
sprint.getRange("G12:G21").conditionalFormats.add("containsText", { text: "Done", format: { fill: green, font: { color: "#176B3A", bold: true } } });
sprint.getRange("A24:H24").merge();
sprint.getRange("A24").values = [["IMPLEMENTATION TASKS"]];
sprint.getRange("A24:G24").format = sectionFmt;
sprint.getRange("A25:H25").values = [["Task ID","Related Story","Task","Estimated Hours","Notes","Owner / Workstream","Status","Acceptance / Test Result"]];
sprint.getRange("A25:H25").format = headerFmt;
sprint.getRange(`A26:H${25+tasks.length}`).values = tasks;
sprint.getRange(`A26:H${25+tasks.length}`).format = { verticalAlignment: "top", wrapText: true, font: { color: ink }, borders: { insideHorizontal: { style: "thin", color: "#D7E0E8" } } };
sprint.getRange(`D26:G${25+tasks.length}`).format.horizontalAlignment = "center";
sprint.getRange(`G26:G${25+tasks.length}`).conditionalFormats.add("containsText", { text: "Done", format: { fill: green, font: { color: "#176B3A", bold: true } } });
sprint.getRange("A:A").format.columnWidth = 12;
sprint.getRange("B:B").format.columnWidth = 18;
sprint.getRange("C:C").format.columnWidth = 36;
sprint.getRange("D:D").format.columnWidth = 18;
sprint.getRange("E:E").format.columnWidth = 16;
sprint.getRange("F:F").format.columnWidth = 24;
sprint.getRange("G:G").format.columnWidth = 15;
sprint.getRange("H:H").format.columnWidth = 56;
sprint.getRange("1:1").format.rowHeight = 30;
sprint.getRange("2:2").format.rowHeight = 38;
sprint.getRange("11:11").format.rowHeight = 32;
sprint.getRange("12:21").format.rowHeight = 54;
sprint.getRange("25:25").format.rowHeight = 32;
sprint.getRange(`26:${25+tasks.length}`).format.rowHeight = 45;
sprint.freezePanes.freezeRows(11);
sprint.getRange("G12:G21").dataValidation = { rule: { type: "list", values: ["Not Started","In Progress","Blocked","In Review","Done","Deferred"] } };
sprint.getRange(`G26:G${25+tasks.length}`).dataValidation = { rule: { type: "list", values: ["Not Started","In Progress","Blocked","In Review","Done","Deferred"] } };
const sprintTable = sprint.tables.add("A11:H21", true, "SprintOneStories");
sprintTable.style = "TableStyleMedium2";
const taskTable = sprint.tables.add(`A25:H${25+tasks.length}`, true, "SprintOneTasks");
taskTable.style = "TableStyleMedium4";

// Summary
summary.showGridLines = false;
summary.getRange("A1:H1").merge();
summary.getRange("A1").values = [["AQUAGAS BACKLOG SUMMARY"]];
summary.getRange("A1:H1").format = titleFmt;
summary.getRange("A3:B8").values = [["KPI","Value"],["Total backlog items",null],["Total story points",null],["Implemented items",null],["Partial items",null],["Not started items",null]];
summary.getRange("A3:B3").format = headerFmt;
summary.getRange("B4").formulas = [["=COUNTA('Product Backlog'!A5:A44)"]];
summary.getRange("B5").formulas = [["=SUM('Product Backlog'!F5:F44)"]];
summary.getRange("B6").formulas = [["=COUNTIF('Product Backlog'!H5:H44,\"Done\")"]];
summary.getRange("B7").formulas = [["=COUNTIF('Product Backlog'!H5:H44,\"Partial\")"]];
summary.getRange("B8").formulas = [["=COUNTIF('Product Backlog'!H5:H44,\"Not Started\")"]];
summary.getRange("D3:F3").values = [["Sprint","Items","Story Points"]];
summary.getRange("D3:F3").format = headerFmt;
const sprintNames = [["Sprint 1"],["Sprint 2"],["Sprint 3"],["Sprint 4"],["Sprint 5"],["Sprint 6"]];
summary.getRange("D4:D9").values = sprintNames;
for (let row=4; row<=9; row++) {
  summary.getRange(`E${row}`).formulas = [[`=COUNTIF('Product Backlog'!G5:G44,D${row})`]];
  summary.getRange(`F${row}`).formulas = [[`=SUMIF('Product Backlog'!G5:G44,D${row},'Product Backlog'!F5:F44)`]];
}
summary.getRange("A11:H11").merge();
summary.getRange("A11").values = [["Scope Notes"]];
summary.getRange("A11:H11").format = sectionFmt;
summary.getRange("A12:H15").merge(true);
summary.getRange("A12:A15").values = [["• The original PB-01 to PB-13 are retained and clarified with testable acceptance criteria."],["• Additional stories document capabilities already present in the website, including Google login, maps, saved locations, batch delivery, order chat, proof of delivery, analytics, exports, AI assistants, and responsive UX."],["• PB-11 is marked Partial because realtime in-app updates exist, but external push/SMS delivery is not evident in the codebase."],["• Sprint dates and ownership labels are proposed planning values and can be edited by the team."]];
summary.getRange("A12:H15").format = { fill: pale, font: { color: ink }, wrapText: true, verticalAlignment: "center" };
summary.getRange("A:A").format.columnWidth = 26;
summary.getRange("B:B").format.columnWidth = 16;
summary.getRange("C:C").format.columnWidth = 4;
summary.getRange("D:D").format.columnWidth = 16;
summary.getRange("E:F").format.columnWidth = 15;
summary.getRange("G:H").format.columnWidth = 16;
summary.getRange("1:1").format.rowHeight = 30;
summary.getRange("12:15").format.rowHeight = 34;

// Website Coverage
evidence.showGridLines = false;
evidence.getRange("A1:D1").merge();
evidence.getRange("A1").values = [["WEBSITE COVERAGE & TRACEABILITY"]];
evidence.getRange("A1:D1").format = titleFmt;
evidence.getRange("A3:D3").values = [["Area","Representative Route / Component","Covered Stories","Verification Note"]];
evidence.getRange("A3:D3").format = headerFmt;
const coverage = [
  ["Authentication","/register, /login, /auth/callback, /auth/reset","PB-01, PB-12, PB-14, PB-15","Email confirmation, Google OAuth, password recovery, and role routing are implemented."],
  ["Customer discovery","/home, /store/[id], ProviderCard, StoreMap","PB-02, PB-16, PB-19","Approved suppliers are filtered by location/service and displayed with delivery information."],
  ["Checkout & payments","/checkout, /api/payment/create, /api/payment/webhook","PB-03, PB-04, PB-17, PB-18, PB-21, PB-25","COD and QR Ph flows, cart rules, saved locations, and batch delivery are represented."],
  ["Customer orders","/orders, /orders/[id], StatusBadge, OrderChat","PB-05, PB-06, PB-11, PB-13, PB-27, PB-28, PB-29","History, status, review, reorder, chat, cancellation, and proof are covered."],
  ["Provider portal","/provider/dashboard, /orders, /products, /slots, /settings","PB-07, PB-08, PB-22, PB-23, PB-24, PB-26, PB-30, PB-31, PB-32","Catalog, fulfillment, slots, maps, analytics, settings, and CSV export are covered."],
  ["Admin portal","/admin/dashboard, /providers, /customers, /orders, /reports","PB-09, PB-10","Supplier governance and platform monitoring are covered."],
  ["Experience & reliability","ThemeProvider, BottomNav, SessionTimeout, OfflineBanner, AquaBot","PB-33, PB-34, PB-35, PB-36, PB-37, PB-38, PB-39","Theme, mobile UX, AI help, onboarding, public pages, session, and offline behavior are covered."],
  ["Known gap","README roadmap / no external notification integration found","PB-11, PB-40","Realtime on-screen status exists; external push/SMS remains a backlog item."],
];
evidence.getRange("A4:D11").values = coverage;
evidence.getRange("A4:D11").format = { verticalAlignment: "top", wrapText: true, font: { color: ink }, borders: { insideHorizontal: { style: "thin", color: "#D7E0E8" } } };
evidence.getRange("A:A").format.columnWidth = 24;
evidence.getRange("B:B").format.columnWidth = 54;
evidence.getRange("C:C").format.columnWidth = 32;
evidence.getRange("D:D").format.columnWidth = 64;
evidence.getRange("1:1").format.rowHeight = 30;
evidence.getRange("3:3").format.rowHeight = 32;
evidence.getRange("4:11").format.rowHeight = 62;
evidence.freezePanes.freezeRows(3);
const evidenceTable = evidence.tables.add("A3:D11", true, "WebsiteCoverage");
evidenceTable.style = "TableStyleMedium2";

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });
for (const [sheetName, range] of [["Summary","A1:H15"],["Product Backlog","A1:J44"],["Sprint Backlog","A1:H37"],["Website Coverage","A1:D11"]]) {
  const png = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${previewDir}/${sheetName.replace(/\s+/g,"_")}.png`, new Uint8Array(await png.arrayBuffer()));
}

const check = await workbook.inspect({ kind: "table", range: "Summary!A1:H15", include: "values,formulas", tableMaxRows: 20, tableMaxCols: 10, maxChars: 8000 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan", maxChars: 8000 });
console.log(errors.ndjson);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`OUTPUT=${outputPath}`);
