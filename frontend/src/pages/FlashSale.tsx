import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery } from 'react-query';
import { flashSaleAPI, orderAPI } from '../services/api';

const FlashSale = () => {
    const [purchaseStatus, setPurchaseStatus] = useState<string>('');

    // Fetch sale status
    const { data: flashSale, refetch: refetchSale } = useQuery('flashSale', flashSaleAPI.get, {
        refetchInterval: 5000, // Refetch every 5 seconds
    });

    // Check if any other has been created
    const { data: order, refetch: refetchOrder } = useQuery('order', orderAPI.get);

    // Purchase mutation
    const purchaseMutation = useMutation((productId: string) => orderAPI.create({ productId }), {
        onSuccess: () => {
            setPurchaseStatus('in_progress');
            toast.success('Purchase submitted! Checking status...');

            // wait for 1 second to refresh if we have order or not
            setTimeout(() => {
                refetchSale();
                refetchOrder();
            }, 1000);
        },
        onError: (error: unknown) => {
            type AxiosErrorLike = { response?: { data?: { error?: string } } };
            const err = error as AxiosErrorLike;
            const errorMessage = err.response?.data?.error || 'Purchase failed';
            setPurchaseStatus('failed');
            toast.error(errorMessage);
        },
    });

    const handlePurchase = () => {
        if (flashSale?.data) {
            purchaseMutation.mutate(flashSale.data.product_id);
        }
    };

    const getStatusDisplay = () => {
        if (!flashSale?.data) return 'Loading...';

        switch (flashSale.data.status) {
            case 'upcoming':
                return 'Upcoming';
            case 'active':
                return 'Active';
            case 'ended':
                return 'Ended';
            default:
                return 'Unknown';
        }
    };

    const getPurchaseButtonText = () => {
        if (purchaseMutation.isLoading) return 'Processing...';
        if ((!order?.data && purchaseStatus === 'in_progress') || order?.data?.status === 'pending')
            return 'Checking...';

        if (order?.data?.status === 'completed') return 'Purchased!';

        return 'Buy Now';
    };

    const isPurchaseDisabled = () => {
        return (
            purchaseMutation.isLoading ||
            purchaseStatus === 'in_progress' ||
            purchaseStatus === 'success' ||
            flashSale?.data?.status !== 'active' ||
            flashSale?.data?.remaining_stock === 0 ||
            !!order?.data
        );
    };

    const formatPrice = (priceInCent: number) => {
        return `$${(priceInCent / 100).toFixed(2)}`;
    };

    if (!flashSale?.data) {
        return (
            <div className="flash-sale-container">
                <div className="product-card">
                    <h2>Loading...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="flash-sale-container">
            <div className={`sale-status ${flashSale.data.status}`}>
                Sale Status: {getStatusDisplay()}
            </div>

            <div className="product-card">
                <h2 className="product-name">{flashSale.data.name}</h2>
                <div className="stock-info">
                    <p>Price: {formatPrice(flashSale.data.price_in_cent)}</p>
                    <p>Remaining Stock: {flashSale.data.remaining_stock}</p>
                </div>

                {flashSale.data.status === 'upcoming' && (
                    <div className="countdown">
                        <p>Sale starts in:</p>
                        <p>
                            {formatDistanceToNow(new Date(flashSale.data.start_date), {
                                addSuffix: true,
                            })}
                        </p>
                    </div>
                )}

                {flashSale.data.status === 'active' && (
                    <div className="countdown">
                        <p>Sale ends in:</p>
                        <p>
                            {formatDistanceToNow(new Date(flashSale.data.end_date), {
                                addSuffix: true,
                            })}
                        </p>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <button
                        className="buy-button"
                        onClick={handlePurchase}
                        disabled={isPurchaseDisabled()}
                    >
                        {getPurchaseButtonText()}
                    </button>
                </div>

                {order?.data?.status === 'completed' && (
                    <div style={{ textAlign: 'center', marginTop: '1rem', color: '#10b981' }}>
                        <p>🎉 Congratulations! Your purchase was successful!</p>
                        <p>Order ID: {order?.data.order_id}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FlashSale;
