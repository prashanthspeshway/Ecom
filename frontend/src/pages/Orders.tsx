const Orders = () => {
  return (
    <div className="container px-4 py-16">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h1 className="font-serif text-3xl md:text-4xl font-bold">My Orders</h1>
        <p className="text-muted-foreground">No orders yet</p>
        <a href="/products" className="inline-block">
          <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Start Shopping</button>
        </a>
      </div>
    </div>
  );
};

export default Orders;