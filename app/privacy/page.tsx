import type {Metadata} from "next";
import {SiteHeader} from "@/components/SiteHeader";
import {SiteFooter} from "@/components/SiteFooter";
export const metadata:Metadata={title:"Privacy",description:"How KEO Hairven handles website and enquiry information.",alternates:{canonical:"/privacy"}};
export default function PrivacyPage(){return <><SiteHeader/><main id="main-content"><section className="section privacy-section"><div className="privacy-pagehead"><div className="eyebrow">PRIVACY</div><h1>Your privacy,<br/><em>with care.</em></h1><p>Website privacy information · review before deployment and whenever services change.</p></div><div className="privacy-reading">
<section><h2>Browsing and enquiries</h2><p>You can browse products without a customer account. Product and contact enquiries are composed in your browser and open WhatsApp for your review. The website does not record a completed sale or store your WhatsApp conversation. WhatsApp's own privacy terms apply when you choose to message us.</p></section>
<section><h2>Administration and uploads</h2><p>Authorised administrators use Firebase Authentication and server-side access checks. Product, content and media records are managed in Firebase/Firestore. Approved website media may be stored with Cloudinary and made public when published.</p></section>
<section><h2>Hosting and security</h2><p>Hosting providers may process standard web request and security logs necessary to operate the site. Do not send payment details or sensitive personal information through public enquiry fields.</p></section>
<section><h2>Artificial intelligence</h2><p>The previous site's public AI chat is disabled in this KEO launch. No public AI chat transcript is collected by the disabled assistant.</p></section>
<section><h2>Changes and contact</h2><p>Details may change as the business adds new providers or features. Please use the published Contact page to ask about information associated with your enquiry or request corrections. KEO Hairven should review this notice with its hosting and data practices before launch.</p></section>
</div></section></main><SiteFooter/></>}
