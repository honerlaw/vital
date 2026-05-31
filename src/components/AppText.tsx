import { Text, TextProps } from 'react-native';
import * as theme from '@/theme';

type Variant = keyof typeof theme.type;

interface Props extends TextProps {
  variant: Variant;
  color?: string;
}

export default function AppText({ variant, color, style, ...rest }: Props) {
  return (
    <Text style={[theme.type[variant], color ? { color } : null, style]} {...rest} />
  );
}
