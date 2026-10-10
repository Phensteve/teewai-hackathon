export const LOGO_URL = "https://media.base44.com/images/public/6a6611b97d7894c19d798137/b0f7ec0c0_ef637f6d-505d-4126-8c89-cd8b7ce218b9.png";

export default function Logo({ size = 32, className = "" }) {
  return (
    <img
      src={LOGO_URL}
      alt="teewai"
      className={`rounded-lg object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}