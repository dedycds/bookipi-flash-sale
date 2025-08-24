export interface Order {
    order_id: string;
    product_id: string;
    status: string;
    created_at: Date;
    reserved_token: string;
    user_id: string;
}
