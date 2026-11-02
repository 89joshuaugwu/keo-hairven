"use client";

import Image from "next/image";
import { AdminPageHelp } from "@/components/AdminPageHelp";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { AdminSignOutButton } from "@/components/AdminSignOutButton";

type Role = "owner" | "editor";

type NavItem = {
  label: string;
  href: string;
  ownerOnly?: boolean;
};

const navItems: NavItem[] = [
  { label: "Overview", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Gallery", href: "/admin/gallery" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Media library", href: "/admin/media" },
  { label: "Trash", href: "/admin/trash" },
  { label: "Website content", href: "/admin/content" },
  { label: "Business details", href: "/admin/settings" },
];

function routeIsActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BrandLogo() {
  return (
    <Image
      className="admin-workspace-logo"
      src="/assets/brand/keo-hairven-wordmark.png"
      alt="KEO Hairven"
      width={1200}
      height={810}
      priority
    />
  );
}

function WorkspaceNav({ pathname, role, onNavigate }: { pathname: string; role: Role; onNavigate?: () => void }) {
  return (
    <nav className="admin-workspace-nav" aria-label="Admin workspace">
      {navItems.map((item) => {
        const active = routeIsActive(pathname, item.href);
        const locked = item.ownerOnly && role !== "owner";
        if (locked) {
          return (
            <span key={item.href} className="admin-workspace-navitem is-locked" aria-disabled="true">
              <span>{item.label}</span>
              <small>Owner only</small>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`admin-workspace-navitem${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span>{item.label}</span>
            <span aria-hidden="true">›</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminWorkspaceShell({
  children,
  email,
  role,
}: {
  children: ReactNode;
  email?: string;
  role: Role;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const initial = (email?.trim()?.[0] || "Z").toUpperCase();

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreOpen(false);
        requestAnimationFrame(() => openButtonRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  const closeMore = () => setMoreOpen(false);
  const moreActive = !["/admin", "/admin/products", "/admin/gallery"].some((href) => routeIsActive(pathname, href));

  return (
    <div className="admin-workspace-shell">
      <aside className="admin-workspace-sidebar">
        <Link href="/admin" aria-label="Admin overview"><BrandLogo /></Link>
        <div className="admin-workspace-label">KEO HAIRVEN ADMIN</div>
        <WorkspaceNav pathname={pathname} role={role} />
        <div className="admin-workspace-sidebottom">
          <a href="/" target="_blank" rel="noopener noreferrer">↗ View website</a>
          <div className="admin-workspace-account">
            <span>{email || "Authorised admin"}</span>
            <small>{role}</small>
          </div>
          <AdminSignOutButton />
        </div>
      </aside>

      <div className="admin-workspace-main">
        <header className="admin-workspace-topbar">
          <button
            ref={openButtonRef}
            type="button"
            className="admin-workspace-menu-button"
            aria-label="Open admin menu"
            aria-expanded={moreOpen}
            aria-controls="admin-mobile-more"
            onClick={() => setMoreOpen(true)}
          >
            ☰
          </button>
          <b>KEO Hairven’s workspace</b>
          <div className="admin-workspace-top-actions">
            <AdminPageHelp pathname={pathname} />
            <a href="/" target="_blank" rel="noopener noreferrer">Preview website ↗</a>
            <span className="admin-workspace-avatar" aria-label={`${role} account`}>{initial}</span>
          </div>
        </header>
        {children}
      </div>

      <nav className="admin-workspace-mobile-nav" aria-label="Admin mobile navigation">
        <Link href="/admin" className={routeIsActive(pathname, "/admin") ? "is-active" : ""}>Overview</Link>
        <Link href="/admin/products" className={routeIsActive(pathname, "/admin/products") ? "is-active" : ""}>Products</Link>
        <Link href="/admin/gallery" className={routeIsActive(pathname, "/admin/gallery") ? "is-active" : ""}>Gallery</Link>
        <button
          type="button"
          className={moreActive || moreOpen ? "is-active" : ""}
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          aria-controls="admin-mobile-more"
        >
          More ☰
        </button>
      </nav>

      {moreOpen && (
        <div className="admin-more-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeMore();
        }}>
          <aside id="admin-mobile-more" className="admin-more-panel" role="dialog" aria-modal="true" aria-label="More admin navigation">
            <div className="admin-more-head">
              <div>
                <div className="eyebrow">KEO HAIRVEN WORKSPACE</div>
                <h2>More</h2>
              </div>
              <button type="button" aria-label="Close admin menu" onClick={closeMore}>×</button>
            </div>
            <WorkspaceNav pathname={pathname} role={role} onNavigate={closeMore} />
            <div className="admin-more-account">
              <div><b>{email || "Authorised admin"}</b><small>{role}</small></div>
              <a href="/" target="_blank" rel="noopener noreferrer">Preview website ↗</a>
              <AdminSignOutButton />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
