import { useState, useEffect } from 'react';
import axios from 'axios';
import { Config } from '@/src/api/config';
import { FastFood } from '@/src/types';

export const useFastFoods = () => {
    const [fastFoods, setFastFoods] = useState<FastFood[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Fast Food');

    const fetchFastFoods = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${Config.apiUrl}/fastFood/all`);

            if (response.data && response.data.data) {
                const data = response.data.data.map((item: any, index: number) => {
                    const RawMenu = item.menus || item.menu || [];
                    const mappedMenu = RawMenu.map((m: any) => {
                        // Priority: m.image -> m.coverImage -> m.images[0]
                        const menuImage = m.image || m.coverImage || (m.images && m.images.length > 0 ? m.images[0] : null);

                        return {
                            ...m,
                            titre: m.titre || m.name || 'Produit',
                            prix1: m.prix1 || (m.prices && m.prices[0] ? m.prices[0].price : 0),
                            prix2: m.prix2 || (m.prices && m.prices[1] ? m.prices[1].price : 0),
                            prix3: m.prix3 || (m.prices && m.prices[2] ? m.prices[2].price : 0),
                            optionPrix1: m.optionPrix1 || (m.prices && m.prices[0] ? m.prices[0].description : ''),
                            optionPrix2: m.optionPrix2 || (m.prices && m.prices[1] ? m.prices[1].description : ''),
                            optionPrix3: m.optionPrix3 || (m.prices && m.prices[2] ? m.prices[2].description : ''),
                            image: menuImage || '',
                            images: m.images && m.images.length > 0 ? m.images : (menuImage ? [menuImage] : []),
                            disponibilite: m.disponibilite || m.status || 'available'
                        };
                    });

                    // Priority for restaurant image: item.image -> item.coverImage -> first menu image
                    const restaurantImage = item.image || item.coverImage || (item.images && item.images[0]) || (mappedMenu.length > 0 ? mappedMenu[0].image : null);

                    return {
                        ...item,
                        nom: item.nom || item.name || 'Restaurant',
                        image: restaurantImage || '',
                        menu: mappedMenu,
                        designIndex: index % 4,
                    };
                });
                setFastFoods(data);
            }
        } catch (err: any) {
            console.error('Error fetching fast foods:', err);
            setError('Connection internet indisponible, vérifiez votre réseau');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFastFoods();
    }, []);

    const filteredFastFoods = fastFoods.filter(ff => {
        const fastFoodName = ff.nom || (ff as any).name || '';
        return fastFoodName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return {
        fastFoods: filteredFastFoods,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        refresh: fetchFastFoods
    };
};
