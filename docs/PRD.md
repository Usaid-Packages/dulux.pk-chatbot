# PRD

# **Product Requirements Document (PRD)**

## **Product Outline**

**Vision:** To build a brand new, highly accessible WhatsApp chatbot and a robust companion Customer Service (CS) & Admin dashboard from the ground up. This system will serve as a comprehensive customer portal for Dulux, handling Warranty Registrations, Warranty Claims, Product Discovery, General Complaints, and Warranty Reissuance, while providing an efficient platform for internal teams to manage approvals, customer interactions, historical data, and product catalogs.

**Goals:**

* Develop a WhatsApp chatbot with a structured, rule-based menu system.
* Facilitate Warranty Registrations and Claims with reduced data entry friction (removing "Batch Number" and "Price Paid" fields and capturing bulk liter inputs).
* Implement a "Find a Product" flow that allows users to discover products by surface type (interior/exterior, wood, brick, metal, etc.), powered by a dynamic, admin-managed catalog.
* Enable an "Other Complaints" flow that lets users submit issues with photos, and allow CS agents to reply directly to customers' WhatsApp messages from the web dashboard.
* Allow users to reissue lost warranty cards via OTP verification effortlessly.
* Streamline corrections with a "Registration Resubmission" workflow that prompts users only for missing or incorrect details instead of requiring a complete restart.
* Enable seamless migration of historical warranty and claims data from the legacy system via bulk imports (Excel/CSV).

**Success Metrics:**

* High completion rate for WhatsApp warranty registrations and claims.
* Increased user engagement with the "Find a Product" discovery tool.
* Reduced average handling time for general complaints via the unified 2-way CS dashboard chat.
* Processing efficiency for CS agents is measured by the average time to approve/reject/request resubmission on a ticket.

##

## **Competitive Analysis**

* **Asian Paints (Tractor/Apex programs):**
  * *Strengths:* Well-established warranty portals and dedicated mobile applications that connect contractors and homeowners.
  * *Weaknesses:* Requires downloading native apps or navigating complex web forms.
* **Berger Paints:**
  * *Strengths:* Strong dealer network integration for warranty and claims.
  * *Weaknesses:* Claims and general complaints often require physical dealer visits or manual paperwork, lacking a direct-to-consumer digital fast-track.
* **Our Advantage:** By using WhatsApp, an app already installed and widely used by our target demographic, we eliminate the "app fatigue" barrier. The greenfield approach allows us to build a hyper-optimized flow that goes beyond warranties to include product discovery and real-time complaint resolution, establishing a singular, powerful brand touchpoint.

## **User Personas**

1. **The Homeowner (End Consumer):**
* ***Profile:*** An individual who recently purchased or is planning to purchase premium Dulux products for a home project.
* ***Needs:*** A fast way to register warranties, claim replacements, find the right paint for specific surfaces (e.g., masonry, metal), raise general complaints, or retrieve a lost warranty card.
* ***Pain Points:*** Frustrated by repetitive forms, easily confused by technical paint jargon, and highly likely to drop off if forced to download a new app or visit a website.
2. **The Customer Service (CS) Agent / Administrator:**
* ***Profile:*** An internal AkzoNobel team member managing the Assurance backend and customer inquiries.
* ***Needs:*** A clear, structured React JS dashboard to view registration data, trigger automated PDF generation, request specific resubmissions, chat directly with customers raising general complaints, and manage the dynamic product/surface catalog.
* ***Pain Points:*** Slowed down by toggling between multiple communication tools, unable to easily parse missing information, and reliant on developers to update active product lists.

**3\. The Quality Team Member:**

* ***Profile:*** An internal technical expert at AkzoNobel.
* ***Needs:*** A focused dashboard view to inspect claim evidence (photos) forwarded by CS agents to make a final technical determination.
* ***Pain Points:*** Needs high-quality images and structured claim data to quickly assess whether paint failure is due to product issues or application errors.

## **User Journey**

**1\. Warranty Registration & Resubmission Journey:**

* **Initiation:** The user messages the WhatsApp bot, selects "Dulux Assurance," then "Warranty Registration".
* **Verification:** The user consents to data usage and verifies their phone number via OTP.
* **Data Entry:** The user enters Personal Info (Name, Email, City, Site Address), Purchase Date (up to 60 days prior), Dealer Info, and selects Topcoat/Basecoat products with total quantities in liters.
* **Uploads:** User uploads images of the topcoat and basecoat invoices.
* **CS Review & Resubmission:** The submission lands in the CS Dashboard. If the agent finds an error (e.g., a blurry invoice), they trigger a "Resubmission Request." The user receives a WhatsApp notification asking *only* for the corrected invoice, skipping the rest of the form.
* **Approval:** Upon final approval, the system generates an E-Warranty Certificate PDF (showing "Issuance Date" and "No. of Warranty Years") and sends it via WhatsApp.

**2\. Warranty Claim Journey:**

* **Initiation:** The user selects "Warranty Claim" from the menu.
* **Details & Evidence:** The user enters their Warranty Registration Number, selects the Topcoat, chooses the issue type, enters the affected area, and uploads exactly 3 photos (long shot, close shot, alternate angle).
* **Approval Workflow:** The claim is linked to the original registration. CS reviews the initial evidence. If valid, CS sends the compiled verification pack to an internal approver from the Quality team. The Quality team member selects Approve, Reject, or Request More Information. Once approved, the backend processes the resolution and notifies the customer via WhatsApp.

**3\. Find a Product Journey:**

* **Initiation:** The user selects "Find a Product" from the main menu.
* **Discovery:** The chatbot asks the user to select "Interior" or "Exterior," then prompts them to select the surface type (Wood, Brick, Metal, Masonry, etc.).
* **Recommendation:** The chatbot queries the database and returns a visually rich WhatsApp message containing product suggestions, including images, key features, coverage details, and a link to the product webpage.

**4\. Other Complaints Journey:**

* **Initiation:** The user selects "Register Complaint" (or "Other Complaints").
* **Submission:** The user types a description of their issue and is prompted to upload up to 3 images.
* **CS Resolution (2-Way Chat):** The complaint appears in the CS Dashboard. An agent claims the ticket and types a response in the dashboard. The response is routed back to the customer's WhatsApp, enabling a seamless 2-way conversation until the issue is resolved.

**5\. Warranty Card Reissuance Journey:**

* **Initiation:** The user selects an option to reissue a lost warranty card.
* **Verification:** The system prompts for the registered phone number and verifies the user via OTP.
* **Fulfillment:** Upon successful verification, the backend retrieves the active E-Warranty Certificate PDF and sends it directly to the user's WhatsApp.

**6\. Administrator Management Journey:**

* **Catalog Management:** The Admin adds, updates, or deletes paint products, surface types, product images, and coverage details. Changes are reflected instantly in the "Find a Product" and Registration chatbot menus.
* **Historical Data Migration:** The Admin uploads an Excel/CSV file containing legacy warranty/claims data. The system validates and imports the records.

**7\. Manual Warranty Registration Journey (CS Dashboard):**

* **Initiation:** The Customer Service agent opens the "Create Warranty Registration" form in the web dashboard.
* **Data Entry:** The agent manually inputs the customer's personal details, dealer information, product details, and uploads the topcoat and basecoat invoices.
* **Routing:** The system generates a unique Registration Code and routes the entry into the standard automated approval and document generation workflow

## **Functional Requirements**

* **WhatsApp Chatbot Interface:** Fully rule-based/menu-driven via the WhatsApp Business API.
* **OTP Verification:** Standard OTP generation/verification flow for mobile numbers (used in Registration and Reissuance).
* **Product Discovery Engine:** A tiered routing system (Interior/Exterior \-\> Surface Type) that fetches and formats product data (images, features, coverage, URLs) from the backend.
* **Optimized Data Capture:** Exclude "Batch Number" and "Price Paid" for all paints; capture quantities in open numeric liters.

* **Resubmission State Management:** The system must track which specific fields/images are rejected by CS and dynamically generate a customized WhatsApp prompt asking the user *only* for the missing or corrected data.

* **Unified CS Web Dashboard:** \* Approval portal for Warranty Registrations and Claims.
  * 2-Way Chat interface allowing agents to reply to "Other Complaints" directly via the WhatsApp Business API.
  * Product Catalog CRUD (Create, Read, Update, Delete) module for managing the paint database, surface mappings, and product imagery.
  * The Historical Data Import module accepts Excel/CSV formats with validation and error reporting.
  * A comprehensive form allowing CS agents to manually create warranty registrations on behalf of users unable to use WhatsApp, including document upload capabilities.
  * An internal approval workflow allowing CS agents to compile claim details and forward them to the Quality team for final technical approval.
* **Automated Document Generation:** Auto-generate a customized PDF E-Warranty Certificate upon registration approval or reissuance requests.

## **Non-Functional Requirements**

* **Performance:** PDF generation, bulk data imports, and product image retrieval must be processed efficiently to avoid timing out the user's WhatsApp session.
* **Real-Time Communication:** The 2-way chat for "Other Complaints" must support low-latency message delivery between the React JS dashboard and the WhatsApp Business API.
* **Data Integrity:** The historical data import process must include strict validation rules to ensure legacy data conforms to the new database schema without corrupting existing records.
* **Security:** All PII and uploaded media must be securely stored and encrypted at rest. Admin modules must be restricted via Role-Based Access Control (RBAC).

## **Technical Requirements**

* **Backend:** Python using the Django Framework to handle core API logic, WhatsApp webhooks, 2-way chat routing, product catalog management, data import logic, and database ORM.
* **Real-Time Infrastructure:** WebSockets (via Django Channels) to enable real-time message syncing for the CS agent dashboard during 2-way "Other Complaints" chats.
* **Background Tasks:** Celery for handling heavy asynchronous tasks such as parsing bulk Excel imports, generating PDF E-Warranty Certificates, and dispatching outbound WhatsApp templates.
* **Task Scheduling:** Celery Beat for scheduled operations.
* **Traffic Management:** Traefik for request routing, load balancing, and reverse proxy management.
* **Frontend (CS Dashboard):** React JS for building the internal web dashboard, including the approval interface, live chat UI, product CRUD forms, and data import upload UI.
* **Database:** PostgreSQL for relational data storage (Users, Registrations, Claims, Product Catalogs, Surface Mappings, Chat Transcripts).

# Feature Requests

# FR \- 1

# Changelog

| Date | Change | Time & Effort Impact  | Reason for Change (Optional) | Requested By (Internal / External) |
| :---- | :---- | :---- | :---- | :---- |
