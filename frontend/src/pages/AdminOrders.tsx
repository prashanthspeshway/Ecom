import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authFetch, getRole, getToken } from "@/lib/auth";

type Progress = { placed?: number; dispatched?: number; in_transit?: number; shipped?: number; out_for_delivery?: number; delivered?: number };
type OrderItem = { productId: string; quantity: number; price?: number; name?: string; image?: string; progress?: Progress };
type Order = { id: string; user: string; items: OrderItem[]; status: string; createdAt: number };

const AdminOrders = () => {
  const qc = useQueryClient();
  const [role, setRole] = useState<string | null>(getRole());
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }
      
      // Check localStorage first - if admin, allow immediately
      const currentRole = getRole();
      if (currentRole === "admin") {
        setIsAuthorized(true);
        setIsChecking(false);
      }
      
      // Verify with backend in background
      try {
        const res = await authFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          const backendRole = data.role || data.user?.role || null;
          if (backendRole && backendRole !== "undefined") {
            localStorage.setItem("auth_role", backendRole);
            setRole(backendRole);
            if (backendRole === "admin") {
              setIsAuthorized(true);
            } else {
              navigate("/login");
            }
          }
        }
        setIsChecking(false);
        try {
          localStorage.setItem("admin_last_seen_orders_ts", String(Date.now()));
          window.dispatchEvent(new Event("orders:update"));
        } catch (e) { void e; }
      } catch (e) {
        // If API fails but we have admin in localStorage, allow access
        if (currentRole === "admin") {
          setIsAuthorized(true);
        }
        setIsChecking(false);
        try {
          localStorage.setItem("admin_last_seen_orders_ts", String(Date.now()));
          window.dispatchEvent(new Event("orders:update"));
        } catch (e) { void e; }
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Check authorization
  const currentRole = getRole();
  const hasToken = getToken();
  const isAdmin = currentRole === "admin" || isAuthorized;
  
  // Show loading while checking (only if we don't have admin role)
  if (isChecking && !isAdmin) {
    return (
      <div className="container px-4 py-16 text-center">
        <p>Verifying admin access...</p>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="container px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">Not Authenticated</h1>
        <p>Please log in to access orders.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>You need admin privileges to access this page.</p>
      </div>
    );
  }
  const { data: orders = [], error, isLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/orders");
      if (!res.ok) {
        const msg = res.status === 401 ? "Unauthorized" : "Failed to load";  
        throw new Error(msg);
      }
      return res.json();
    },
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await authFetch(`/api/admin/orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.refetchQueries({ queryKey: ["admin-orders"] });
    },
  });
  const itemStageMutation = useMutation({
    mutationFn: async ({ id, pid, stage }: { id: string; pid: string; stage: keyof Progress }) => {
      const res = await authFetch(`/api/admin/orders/${id}/item/${pid}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.refetchQueries({ queryKey: ["admin-orders"] });
    },
  });
  const filtered = useMemo(() => {
    return (orders || []).filter((o) => {
      const matchesSearch = search ? (o.user?.toLowerCase().includes(search.toLowerCase()) || o.id?.toLowerCase().includes(search.toLowerCase())) : true;
      const matchesStatus = statusFilter === "all" ? true : o.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="container px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl md:text-4xl font-bold">Orders</h1>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID or email" className="w-[240px]" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="placed">Placed</SelectItem>
              <SelectItem value="dispatched">Dispatched</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><p>Loading orders…</p></div>
      ) : error ? (
        <div className="text-center py-16">
          <h2 className="font-serif text-2xl font-bold mb-2">Access Restricted</h2>
          <p className="mb-4">{String(error.message || "Failed to load orders")}</p>
          {role !== "admin" ? (
            <div className="flex items-center justify-center gap-3">
              <Button asChild>
                <a href="/login?redirect=/admin/orders">Login as Admin</a>
              </Button>
            </div>
          ) : null}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No orders found</p>
          <p className="text-xs text-muted-foreground mt-2">Orders count: {(orders || []).length}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">Showing {filtered.length} order(s)</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => {
                const total = (o.items || []).reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono">{o.id}</TableCell>
                    <TableCell>{o.user}</TableCell>
                    <TableCell>{new Date(o.createdAt || Date.now()).toLocaleString()}</TableCell>
                    <TableCell>{o.items?.length || 0}</TableCell>
                    <TableCell>₹{total.toLocaleString()}</TableCell>
                    <TableCell>
                      <Select value={o.status || "placed"} onValueChange={(v) => updateMutation.mutate({ id: o.id, status: v })}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="placed">Placed</SelectItem>
                          <SelectItem value="dispatched">Dispatched</SelectItem>
                          <SelectItem value="in_transit">In Transit</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" asChild><a href={`/order/${o.id}`}>Manage</a></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {/* secondary card container removed as requested */}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;