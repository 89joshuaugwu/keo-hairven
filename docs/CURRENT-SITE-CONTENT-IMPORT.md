# Current Site Content Import

## Purpose

The first version of Zara Luxe Strands ships with useful content already visible on the public website. The owner should not have to recreate that information manually before using the Admin.

Use **Admin → Business Details → Use current site content** once. The migration converts the content already on the website into normal editable CMS records.

## What is imported

- current Product catalogue entries
- current Gallery looks
- current Services
- FAQs
- Homepage/About/shared CTA content
- Business Details
- current website images and short videos

Products, Gallery and Services are also written to their safe public projection collections so the existing public site continues to show the same content after import.

## Media

The importer creates normal Media Library records for the packaged site media. When Cloudinary is configured, it also asks Cloudinary to copy each packaged asset into `zara-luxe-strands/site-content`.

A Cloudinary copy failure does not make the entire migration fail. The media record can temporarily keep using its packaged `/assets/...` URL and can later be replaced normally from Media Library.

## Existing owner edits

The migration is intentionally conservative:

- existing Product/Look/Service records are matched by slug when possible;
- existing editable fields are retained where already supplied;
- existing published Website Content and Business Details are retained;
- existing FAQ wording is retained;
- the operation marks `siteSetup/current` as ready so it is not repeatedly run after success.

## Public messaging

Technical source labels such as “AI-generated”, “sample product”, “illustrative image” and “design preview” are not part of the customer-facing experience. Source/provenance fields may still exist internally where useful for CMS integrity, media organization and client-permission safeguards.
