import React from 'react';
import Svg, { Path } from 'react-native-svg';

export interface WhatsAppIconProps {
  size?: number;
  color?: string;
}

export const WhatsAppIcon: React.FC<WhatsAppIconProps> = ({
  size = 24,
  color = '#ffffff',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.5 14.4c-.3-.1-1.7-.8-2-1-.3-.1-.4-.1-.6.1-.2.3-.7 1-.9 1.1-.2.2-.3.2-.6.1s-1.3-.5-2.4-1.5c-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.6-1.5-.8-2c-.2-.6-.5-.5-.6-.5h-.5c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9s1.2 3.4 1.4 3.6c.2.2 2.4 3.7 5.9 5.2.8.4 1.5.6 2 .8.8.3 1.6.2 2.2.1.7-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.3-.6-.4z"
        fill={color}
      />
      <Path
        d="M12 2a9.9 9.9 0 0 0-8.5 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.2.8.9-3.1-.2-.3A8.2 8.2 0 1 1 12 20.2z"
        fill={color}
      />
    </Svg>
  );
};

export default WhatsAppIcon;
