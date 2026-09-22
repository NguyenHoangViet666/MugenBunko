import React from 'react';
import { ColorValue } from 'react-native';
import Svg, { Path, Circle, Polyline, Line, Rect, Polygon } from 'react-native-svg';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

interface MonochromeIconProps {
  name: string;
  size?: number;
  color?: ColorValue | string;
  style?: any;
}

export const MonochromeIcon: React.FC<MonochromeIconProps> = ({
  name,
  size = 20,
  color,
  style,
}) => {
  const colorScheme = useColorScheme();
  const defaultColor = Colors[colorScheme].text;
  const strokeColor = ((color as any) || defaultColor) as string;

  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: strokeColor,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
  };

  switch (name) {
    case 'home':
      return (
        <Svg {...svgProps}>
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <Polyline points="9 22 9 12 15 12 15 22" />
        </Svg>
      );

    case 'compass':
      return (
        <Svg {...svgProps}>
          <Circle cx="12" cy="12" r="10" />
          <Polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </Svg>
      );

    case 'book-open':
      return (
        <Svg {...svgProps}>
          <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </Svg>
      );

    case 'message-square':
      return (
        <Svg {...svgProps}>
          <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Svg>
      );

    case 'user':
      return (
        <Svg {...svgProps}>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <Circle cx="12" cy="7" r="4" />
        </Svg>
      );

    case 'search':
      return (
        <Svg {...svgProps}>
          <Circle cx="11" cy="11" r="8" />
          <Line x1="21" y1="21" x2="16.65" y2="16.65" />
        </Svg>
      );

    case 'bookmark':
      return (
        <Svg {...svgProps}>
          <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </Svg>
      );

    case 'star':
      return (
        <Svg {...svgProps}>
          <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </Svg>
      );

    case 'eye':
      return (
        <Svg {...svgProps}>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <Circle cx="12" cy="12" r="3" />
        </Svg>
      );

    case 'chevron-right':
      return (
        <Svg {...svgProps}>
          <Polyline points="9 18 15 12 9 6" />
        </Svg>
      );

    case 'chevron-left':
      return (
        <Svg {...svgProps}>
          <Polyline points="15 18 9 12 15 6" />
        </Svg>
      );

    case 'arrow-left':
      return (
        <Svg {...svgProps}>
          <Line x1="19" y1="12" x2="5" y2="12" />
          <Polyline points="12 19 5 12 12 5" />
        </Svg>
      );

    case 'play':
      return (
        <Svg {...svgProps} fill={strokeColor}>
          <Polygon points="5 3 19 12 5 21 5 3" />
        </Svg>
      );

    case 'sliders':
      return (
        <Svg {...svgProps}>
          <Line x1="4" y1="21" x2="4" y2="14" />
          <Line x1="4" y1="10" x2="4" y2="3" />
          <Line x1="12" y1="21" x2="12" y2="12" />
          <Line x1="12" y1="8" x2="12" y2="3" />
          <Line x1="20" y1="21" x2="20" y2="16" />
          <Line x1="20" y1="12" x2="20" y2="3" />
          <Line x1="1" y1="14" x2="7" y2="14" />
          <Line x1="9" y1="8" x2="15" y2="8" />
          <Line x1="17" y1="16" x2="23" y2="16" />
        </Svg>
      );

    case 'x':
      return (
        <Svg {...svgProps}>
          <Line x1="18" y1="6" x2="6" y2="18" />
          <Line x1="6" y1="6" x2="18" y2="18" />
        </Svg>
      );

    case 'trash-2':
      return (
        <Svg {...svgProps}>
          <Polyline points="3 6 5 6 21 6" />
          <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <Line x1="10" y1="11" x2="10" y2="17" />
          <Line x1="14" y1="11" x2="14" y2="17" />
        </Svg>
      );

    case 'info':
      return (
        <Svg {...svgProps}>
          <Circle cx="12" cy="12" r="10" />
          <Line x1="12" y1="16" x2="12" y2="12" />
          <Line x1="12" y1="8" x2="12.01" y2="8" />
        </Svg>
      );

    case 'feather':
      return (
        <Svg {...svgProps}>
          <Path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
          <Line x1="16" y1="8" x2="2" y2="22" />
          <Line x1="17.5" y1="15" x2="9" y2="15" />
        </Svg>
      );

    case 'heart':
      return (
        <Svg {...svgProps}>
          <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </Svg>
      );

    case 'message-circle':
      return (
        <Svg {...svgProps}>
          <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </Svg>
      );

    case 'type':
      return (
        <Svg {...svgProps}>
          <Polyline points="4 7 4 4 20 4 20 7" />
          <Line x1="9" y1="20" x2="15" y2="20" />
          <Line x1="12" y1="4" x2="12" y2="20" />
        </Svg>
      );

    case 'moon':
      return (
        <Svg {...svgProps}>
          <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </Svg>
      );

    case 'alert-circle':
    default:
      return (
        <Svg {...svgProps}>
          <Circle cx="12" cy="12" r="10" />
          <Line x1="12" y1="8" x2="12" y2="12" />
          <Line x1="12" y1="16" x2="12.01" y2="16" />
        </Svg>
      );
  }
};

export default MonochromeIcon;
