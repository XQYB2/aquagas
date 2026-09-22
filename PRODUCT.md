# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

AquaGas serves household customers ordering water and LPG, local suppliers fulfilling those orders, and administrators operating the marketplace. Customers need to find a suitable nearby store, understand price and delivery expectations, order safely, and follow delivery progress without friction.

## Product Purpose

AquaGas connects households with verified nearby water-refilling stations and LPG suppliers. Success means customers can discover, order, pay, track, communicate, and reorder confidently while providers can keep availability and fulfillment information accurate.

## Positioning

AquaGas combines local water and LPG delivery in one location-aware marketplace, including standard and scheduled batch delivery workflows.

## Operating Context

Customers use the responsive website and customer mobile app at home or while coordinating a delivery. Providers use web and mobile-provider dashboards. Orders may use cash on delivery or QR Ph through PayMongo, and order status updates, chat, notifications, inventory, ratings, and delivery proof are part of the workflow.

## Capabilities and Constraints

- Preserve Supabase authentication, data access, realtime updates, inventory controls, and PayMongo payment flows.
- Customer discovery supports distance, rating, service type, and delivery-speed filtering.
- AquaBot uses live marketplace and customer-order context and may recommend products or prepare cart actions.
- Responsive customer surfaces must work across phone, tablet, laptop, and wide desktop browsers.
- Product and delivery claims must come from stored marketplace data rather than invented content.

## Brand Commitments

The product name is AquaGas. Preserve its recognizable blue “Aqua” and red “Gas” identity, existing logo, practical and friendly language, and water/LPG service distinction. Marketplace references may inform composition and interaction but must not be copied or introduce another company’s identity.

## Evidence on Hand

The repository contains the production application, AquaGas logo assets, real provider/product/order/review data integrations, customer and provider workflows, and user-provided screenshots of the current interface and desired marketplace interaction patterns.

## Product Principles

- Put the customer’s next useful action within immediate reach.
- Make local availability, trust, price, and delivery expectations easy to compare.
- Preserve continuity across website and mobile experiences.
- Use responsive space deliberately instead of stretching or centering a narrow phone layout on desktop.
- Keep operational states and failures explicit and recoverable.

## Accessibility & Inclusion

Interactive targets must remain touch-friendly, keyboard accessible, visibly focused, and legible at responsive breakpoints. Color must not be the only indicator of order, stock, payment, or availability status.
