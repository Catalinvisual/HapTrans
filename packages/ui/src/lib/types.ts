export type ForwardRefComponent<T, P = Record<PropertyKey, unknown>> = React.ForwardRefExoticComponent<
  React.RefAttributes<T> & P
>;