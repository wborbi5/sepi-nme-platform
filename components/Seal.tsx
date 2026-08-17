import Image from "next/image";

/*
 * The SEPi seal — navy eagle mark, clipped to a circle so the seal's
 * white canvas disappears into the cream background. Asset lives at
 * public/logo/seal.png (white-on-navy variant at seal-navy-bg.png).
 */
export default function Seal({ size = 48 }: { size?: number }) {
  return (
    <Image
      src="/logo/seal.png"
      alt="Sigma Eta Pi seal"
      width={size}
      height={size}
      priority
      className="rounded-full select-none"
      style={{ width: size, height: size }}
    />
  );
}
