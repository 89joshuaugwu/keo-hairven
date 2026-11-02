export type AdminPageGuide = {
  title: string;
  intro: string;
  steps: { title: string; text: string }[];
  reminder: string;
  links: { label: string; href: string }[];
};
const recovery = { label: "Open Trash", href: "/admin/trash" };
const categories = { label: "Manage categories", href: "/admin/categories" };
const media = { label: "Open Media library", href: "/admin/media" };
const guides: Record<string, AdminPageGuide> = {
  overview: {
    title: "Your workspace",
    intro: "This is your starting point for updating the shop and salon website.",
    steps: [
      { title: "Choose what to update", text: "Use the menu to manage products, gallery photos, services or website information. On a phone, tap More to see the full menu." },
      { title: "Use the quick actions", text: "Add product starts a new product. Upload a look starts a gallery entry. Edit website details opens your homepage words and frequently asked questions." },
      { title: "Review before publishing", text: "Drafts are private. Check photos, names and prices before publishing something for customers to see." },
      { title: "Check the customer view", text: "Preview website opens the public website in another tab so you can see it as a customer." },
    ],
    reminder: "Removed items live in Trash. You can restore them during their recovery window.",
    links: [recovery, { label: "Open Products", href: "/admin/products" }],
  },
  products: {
    title: "Manage your products",
    intro: "Keep the products customers browse accurate, with clear photos and prices.",
    steps: [
      { title: "Find an item", text: "Search by name, or use the status and category dropdowns. Draft means private; Published means customers can see it." },
      { title: "Add or edit a product", text: "Tap Add product to create an item, or Edit beside an existing one. Add the correct name, category, description, price and photos." },
      { title: "Use the extra actions", text: "The three-dot menu lets you duplicate an item as a draft, unpublish a live item or move it to Trash. Unpublish hides it without starting the deletion countdown." },
      { title: "Recover removed products", text: "Products moved to Trash disappear from this list. Open Trash to restore one as a draft or permanently delete it." },
    ],
    reminder: "A draft is not visible to customers. Publish it when you are ready.", links: [categories, recovery],
  },
  productEditor: {
    title: "Add or edit a product",
    intro: "Build a product page customers can understand before they enquire.",
    steps: [
      { title: "Describe the actual item", text: "Enter its name, choose a category and write its description. Include details customers need, such as length, colour and finish." },
      { title: "Set price and availability", text: "Choose a fixed price, starting price, range or enquiry option. Set availability honestly and check the amounts before saving." },
      { title: "Choose the photos", text: "Upload or select images from the library. Use the correct image type and add a description of the image. A real product photo should show the item being offered." },
      { title: "Save, preview and publish", text: "Save your edits, review the preview and publish when ready. Saving a draft alone does not put it on the website." },
    ],
    reminder: "If someone else changed the item while you were editing, reload the latest version before trying again.", links: [categories, media],
  },
  gallery: {
    title: "Manage your gallery",
    intro: "Show customers your work and clearly label inspiration images.",
    steps: [
      { title: "Find a look", text: "Search by name or caption. Use category, image label and status filters to narrow the list." },
      { title: "Add or edit a look", text: "Upload a look creates an entry. Edit details lets you change the name, caption, category, photos and price information." },
      { title: "Label images correctly", text: "Distinguish KEO Hairven’s real work from campaign or inspiration images. Confirm permission before publishing identifiable client photos." },
      { title: "Manage visibility", text: "Publish shows the look to customers. The More menu can duplicate it, unpublish it or move it to Trash." },
    ],
    reminder: "Removed looks are managed in Trash, where you can restore them as drafts.", links: [categories, recovery],
  },
  galleryEditor: {
    title: "Add or edit a gallery look",
    intro: "Create a clear, honest showcase of a style or service.",
    steps: [
      { title: "Name and categorise the look", text: "Choose a clear name, a gallery category and a useful caption explaining the style." },
      { title: "Choose and label the images", text: "Upload photos or select them from Media library. Choose the correct image type and confirm client permission when needed." },
      { title: "Choose how to show the price", text: "Set the appropriate price display. Leave it as an enquiry when the cost depends on the customer?s requirements." },
      { title: "Review and publish", text: "Save the entry and check its preview. Publish only when the photos, permissions and details are ready." },
    ],
    reminder: "Campaign and inspiration images should never be presented as completed client work.", links: [categories, media],
  },
  services: {
    title: "Manage your services",
    intro: "Explain the services you offer, their prices and how customers should prepare.",
    steps: [
      { title: "Choose a service", text: "Tap Edit in the service list to open its details, or Add service to start a new one." },
      { title: "Explain what is included", text: "Enter a clear service name and description. Use the preparation information to tell customers what to bring or do beforehand." },
      { title: "Set the price and image", text: "Choose a fixed price, starting price, range or quote option. Add an image that represents the service accurately." },
      { title: "Save and control visibility", text: "Save your edits and publish when ready. Use the three-dot menu to duplicate, unpublish or move a service to Trash." },
    ],
    reminder: "The Categories page currently manages product and gallery categories. Service labels are managed separately.", links: [media, recovery],
  },
  categories: {
    title: "Organise your categories",
    intro: "Categories help customers find products and gallery looks, and help your team organise them.",
    steps: [
      { title: "Add a category", text: "Enter a short, clear name under the correct section, then tap Add category. Product and gallery categories are separate lists." },
      { title: "Rename a category", text: "Edit the name in its row and tap Save. The category keeps its assigned items when its name changes." },
      { title: "Change the order", text: "Use the up and down arrows. The change is saved immediately and controls the order shown in the editors and public filters." },
      { title: "Delete an unused category", text: "Only the owner can delete a category. First move all its assigned items to another category, including drafts and items in Trash, then confirm deletion." },
    ],
    reminder: "Choose names describing what customers are looking for, such as Wigs or Bridal Styling. Avoid creating several names for the same collection.", links: [{ label: "Open Products", href: "/admin/products" }, { label: "Open Gallery", href: "/admin/gallery" }],
  },
  media: {
    title: "Manage photos and videos",
    intro: "Media library stores the images and videos used in products, gallery entries and website sections.",
    steps: [
      { title: "Upload an image or video", text: "Tap Upload media, choose the file and fill in its description and image type. Confirm permissions where required." },
      { title: "Find and inspect a file", text: "Search or use the filter and sort dropdowns. Details shows information about a file and where it is used." },
      { title: "Replace carefully", text: "Replace changes an uploaded file. Check the places using it before replacing, because those pages may show the replacement too." },
      { title: "Remove files you no longer need", text: "Delete moves an uploaded file to Trash. Permanently deleting media can be blocked while another item still uses it." },
    ],
    reminder: "Current-site sample media cannot be replaced or removed here. Upload your own media and select it in the relevant editor.", links: [recovery],
  },
  content: {
    title: "Edit website content",
    intro: "Update homepage words, visible sections, website media and frequently asked questions.",
    steps: [
      { title: "Edit the words and sections", text: "Change the text customers read. Use the section switches to choose which homepage sections are shown." },
      { title: "Choose website media", text: "Use the media controls to pick an image or video from Media library for the relevant section." },
      { title: "Manage questions", text: "Add or edit questions and answers, choose their groups and reorder them. An unsaved removal can be undone here; after saving, removed questions are recovered from Trash." },
      { title: "Save, preview and publish", text: "Save your draft, review the website preview and publish the changes when ready. A saved draft is separate from the published website content." },
    ],
    reminder: "Keep answers accurate. KEO Muse also uses approved published business information when helping customers.", links: [media, recovery],
  },
  settings: {
    title: "Update business details",
    intro: "Keep the contact information customers use across the website up to date.",
    steps: [
      { title: "Check contact and location", text: "Review the phone, WhatsApp, address and other contact fields. Use the business?s current details." },
      { title: "Check business links", text: "Enter the full official social profile links, including https://. Customers and KEO Muse can use these published links." },
      { title: "Review delivery information", text: "Make sure the delivery and business information matches what you actually offer." },
      { title: "Save the details", text: "Only the owner can publish these business-wide changes. Saving business details publishes them, so check the preview and field values first." },
    ],
    reminder: "Use current site content is an import/setup action. Use it intentionally to bring the existing website content into admin management.", links: [{ label: "Edit website content", href: "/admin/content" }],
  },
  ai: {
    title: "Manage KEO Muse",
    intro: "The owner uses this page to control the website assistant and its AI connections.",
    steps: [
      { title: "Add a connection", text: "Enter a Gemini connection name and API key. Save and test the connection before relying on it." },
      { title: "Choose connection priority", text: "Set the order of available connections. If the first connection cannot answer, another connection or the saved fallback answers may be used." },
      { title: "Set usage limits", text: "Review the daily request cap and model settings. Your app limit does not increase the allowance supplied by Gemini." },
      { title: "Try a customer question", text: "Use the reply test and fallback preview to check how the assistant responds. Keep published catalogue and business information accurate." },
    ],
    reminder: "API keys are private credentials. Do not share them with customers or paste them into public website text.", links: [{ label: "Update business details", href: "/admin/settings" }, { label: "Open Products", href: "/admin/products" }],
  },
  trash: {
    title: "Recover removed items",
    intro: "This is the single place to manage removed products, services, gallery looks, questions and media.",
    steps: [
      { title: "Check the recovery time", text: "The countdown starts when an item is saved to Trash. You normally have 24 hours to recover it before it becomes eligible for automatic deletion." },
      { title: "Restore an item", text: "Restore returns content as a draft, or media as an active file. Review and publish restored content before expecting customers to see it." },
      { title: "Delete permanently", text: "Only the owner can use Delete forever. Read the confirmation carefully: permanent deletion cannot be undone." },
      { title: "Start older countdowns", text: "If older items show Retention not started, the owner can use Start 24-hour countdown to give them a fresh recovery window." },
    ],
    reminder: "Automatic deletion depends on a scheduled cleanup being configured. Expired items stay until cleanup runs. Used media is protected; failed cleanup can retry later.", links: [{ label: "Open Products", href: "/admin/products" }, media],
  },
};
export function getAdminPageGuide(pathname: string): AdminPageGuide {
  if (pathname.startsWith("/admin/products/")) return guides.productEditor;
  if (pathname.startsWith("/admin/gallery/")) return guides.galleryEditor;
  const key = pathname.split("/")[2] || "overview";
  return guides[key] || guides.overview;
}
