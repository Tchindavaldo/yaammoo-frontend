import React, { useState } from 'react';
import { View, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Image } from 'expo-image';
import { styles } from '../CheckoutSheet.styles';

interface ImageSliderProps {
  images: string[];
}

export const ImageSlider: React.FC<ImageSliderProps> = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setActiveIndex(index);
  };

  return (
    <View style={styles.sliderWrapper}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <Image 
            source={item ? { uri: item } : require('@/assets/blur3.jpg')} 
            style={styles.avatarImage} 
          />
        )}
        style={styles.imageList}
      />
      {images.length > 1 && (
        <View style={styles.paginationDots}>
          {images.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.dot, 
                activeIndex === i ? styles.dotActive : styles.dotInactive
              ]} 
            />
          ))}
        </View>
      )}
    </View>
  );
};
