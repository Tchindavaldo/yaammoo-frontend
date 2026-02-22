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
                const data = response.data.data.map((item: any, index: number) => ({
                    ...item,
                    designIndex: index % 4,
                }));
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

    const filteredFastFoods = fastFoods.filter(ff =>
        ff.nom.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
