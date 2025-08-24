export function getUniqueOrderKey({
    product_id,
    user_id,
}: {
    product_id: string;
    user_id: string;
}): string {
    return `order:${product_id}:${user_id}`;
}
