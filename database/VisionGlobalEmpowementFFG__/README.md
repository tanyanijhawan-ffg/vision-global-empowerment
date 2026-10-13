# Database reference

This folder now acts as the schema and database design reference for the project.

## Contents

- schema/schema.sql: PostgreSQL DDL for the student monitoring system
- SETUP.md: local setup notes
- DB setup.pdf: setup reference

## Purpose

- Keep the authoritative database schema in one place
- Make it easier to align the Django backend models with the database design
- Avoid duplicating backend application code in this repository

## How to use it

- Treat this folder as the source of truth for tables, relationships, and constraints
- Implement the corresponding Django models and migrations in [backend/django-backend](../../backend/django-backend)

