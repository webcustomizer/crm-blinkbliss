"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";
import { Search, Users, ChevronLeft, ChevronRight, Phone } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format-date";

type Customer = {
  id: string;

  name: string | null;

  phone: string;

  city: string | null;

  purpose: string | null;

  assignedTo: {
    id: string;
    name: string;
  } | null;

  updatedAt: string;
};

function initials(name: string | null) {
  if (!name) return "?";

  const parts = name.trim().split(/\s+/);

  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

export default function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const hasLoaded = useRef(false);

  const getCustomers = useCallback(async () => {
    try {
      if (!hasLoaded.current) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const res = await fetch(
        `/api/admin/customers?page=${page}&limit=20&search=${search}`,
        {
          cache: "no-store",
        },
      );

      const data = await res.json();

      setCustomers(data.customers || []);

      setPagination(
        data.pagination || {
          page: 1,
          totalPages: 1,
          total: 0,
        },
      );
    } catch {
      toast.error("Failed to load customers.");
    } finally {
      setLoading(false);

      setRefreshing(false);

      hasLoaded.current = true;
    }
  }, [page, search]);

  const customersRef = useRef(getCustomers);

  useEffect(() => {
    customersRef.current = getCustomers;
  }, [getCustomers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      customersRef.current();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, page]);

  useEffect(() => {
    const channel = supabase

      .channel("customer-changes")

      .on(
        "postgres_changes",

        {
          event: "*",
          schema: "public",
          table: "Lead",
        },

        () => {
          customersRef.current();
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div
        className="
        flex
        min-h-[340px]
        flex-col
        items-center
        justify-center
        gap-3
        rounded-[28px]
        border
        border-[#D4AF37]/15
        bg-gradient-to-br
        from-[#171717]
        to-[#0d0d0d]
        "
      >
        <div
          className="
          h-8
          w-8
          animate-spin
          rounded-full
          border-2
          border-[#D4AF37]/20
          border-t-[#D4AF37]
          "
        />
        <p className="text-sm text-white/40">Loading customers…</p>
      </div>
    );
  }

  return (
    <div
      className="
      relative
      overflow-hidden
      rounded-[28px]
      border
      border-[#D4AF37]/20
      bg-gradient-to-br
      from-[#171717]
      to-[#0d0d0d]
      shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]
      "
    >
      {/* ambient glow */}
      <div
        aria-hidden
        className="
        pointer-events-none
        absolute
        -right-20
        -top-24
        h-64
        w-64
        rounded-full
        bg-[#D4AF37]/10
        blur-[90px]
        "
      />

      {/* HEADER */}

      <div
        className="
        relative
        flex
        flex-col
        gap-5
        border-b
        border-white/10
        p-6
        sm:p-7
        md:flex-row
        md:items-center
        md:justify-between
        "
      >
        <div
          className="
          flex
          items-center
          gap-4
          "
        >
          <div
            className="
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            rounded-2xl
            border
            border-[#D4AF37]/25
            bg-[#D4AF37]/[0.08]
            text-[#D4AF37]
            "
          >
            <Users size={22} strokeWidth={1.75} />
          </div>

          <div>
            <h2
              className="
              text-xl
              font-semibold
              tracking-tight
              text-white
              "
            >
              Customers
            </h2>

            <p
              className="
              mt-0.5
              text-sm
              text-white/40
              "
            >
              {pagination.total} joined customers
            </p>
          </div>
        </div>

        <div
          className="
          relative
          w-full
          md:w-96
          "
        >
          <Search
            size={17}
            className="
            pointer-events-none
            absolute
            left-4
            top-1/2
            -translate-y-1/2
            text-white/30
            "
          />

          <input
            value={search}
            onChange={(e) => {
              setPage(1);

              setSearch(e.target.value);
            }}
            placeholder="Search customer name or phone…"
            className="
            w-full
            rounded-2xl
            border
            border-white/10
            bg-black/30
            py-3
            pl-11
            pr-4
            text-sm
            text-white
            outline-none
            transition-colors
            placeholder:text-white/30
            focus:border-[#D4AF37]/50
            focus:bg-black/50
            "
          />
        </div>
      </div>

      <div
        className="
        relative
        overflow-x-auto
        "
      >
        {refreshing && (
          <div
            className="
          absolute
          inset-0
          z-20
          flex
          items-center
          justify-center
          bg-black/40
          backdrop-blur-sm
          "
          >
            <div
              className="
            flex
            items-center
            gap-2.5
            rounded-2xl
            border
            border-[#D4AF37]/25
            bg-[#111]/90
            px-5
            py-2.5
            text-sm
            text-[#D4AF37]
            "
            >
              <span
                className="
                h-3.5
                w-3.5
                animate-spin
                rounded-full
                border-2
                border-[#D4AF37]/25
                border-t-[#D4AF37]
                "
              />
              Updating customers…
            </div>
          </div>
        )}

        {customers.length === 0 ? (
          <div
            className="
          p-16
          text-center
          "
          >
            <div
              className="
              mx-auto
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              border
              border-[#D4AF37]/20
              bg-[#D4AF37]/[0.06]
              "
            >
              <Users
                size={28}
                strokeWidth={1.5}
                className="text-[#D4AF37]/60"
              />
            </div>

            <h3
              className="
            mt-4
            text-lg
            font-semibold
            text-white
            "
            >
              No customers found
            </h3>

            <p
              className="
            mt-1.5
            text-sm
            text-white/40
            "
            >
              Joined leads will appear here automatically.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr
                className="
              border-b
              border-white/10
              bg-black/20
              "
              >
                <th className="p-5 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  Customer
                </th>

                <th className="p-5 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  Phone
                </th>

                <th className="p-5 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  City
                </th>

                <th className="p-5 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  Purpose
                </th>

                <th className="p-5 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  Salesperson
                </th>

                <th className="p-5 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  Joined
                </th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="
              border-b
              border-white/5
              transition-colors
              hover:bg-[#D4AF37]/[0.04]
              "
                >
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-[#D4AF37]/25
                        bg-[#D4AF37]/[0.08]
                        text-xs
                        font-semibold
                        uppercase
                        text-[#D4AF37]
                        "
                      >
                        {initials(customer.name)}
                      </div>
                      <span className="font-medium text-white">
                        {customer.name || "—"}
                      </span>
                    </div>
                  </td>

                  <td className="p-5">
                    <span className="flex items-center gap-2 text-white/60">
                      <Phone size={13} className="text-white/25" />
                      {customer.phone}
                    </span>
                  </td>

                  <td className="p-5 text-white/60">{customer.city || "—"}</td>

                  <td className="p-5">
                    {customer.purpose ? (
                      <span
                        className="
                        inline-flex
                        rounded-full
                        border
                        border-white/10
                        bg-white/[0.04]
                        px-3
                        py-1
                        text-xs
                        text-white/60
                        "
                      >
                        {customer.purpose}
                      </span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>

                  <td className="p-5">
                    <span className="font-medium text-[#D4AF37]">
                      {customer.assignedTo?.name || "—"}
                    </span>
                  </td>

                  <td className="p-5 text-white/40">
                    {formatDate(customer.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINATION */}

      <div
        className="
        relative
        flex
        items-center
        justify-between
        border-t
        border-white/10
        p-5
        sm:p-6
        "
      >
        <p
          className="
          text-sm
          text-white/40
          "
        >
          Page {pagination.page} of {pagination.totalPages}
        </p>

        <div
          className="
          flex
          gap-3
          "
        >
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="
            flex
            items-center
            gap-1.5
            rounded-xl
            border
            border-white/10
            px-4
            py-2
            text-sm
            font-medium
            text-white
            transition-colors
            hover:border-[#D4AF37]/40
            hover:bg-[#D4AF37]/[0.06]
            disabled:pointer-events-none
            disabled:opacity-30
            "
          >
            <ChevronLeft size={16} />
            Prev
          </button>

          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="
            flex
            items-center
            gap-1.5
            rounded-xl
            border
            border-white/10
            px-4
            py-2
            text-sm
            font-medium
            text-white
            transition-colors
            hover:border-[#D4AF37]/40
            hover:bg-[#D4AF37]/[0.06]
            disabled:pointer-events-none
            disabled:opacity-30
            "
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
