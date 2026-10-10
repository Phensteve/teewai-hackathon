import { motion } from 'framer-motion';

// Reusable Zoah-style dark feature card that rises from the viewport bottom
// as it scrolls into view. olo-deep surface with a frost-edge top light (stays
// in teewai's teal world, not pure black). Single measured 400ms fade+translate,
// no overshoot; staggered 80ms between cards via the `index` prop.
export default function DarkRisingCard({ index = 0, className = '', children, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-3xl bg-olo-deep frost-edge overflow-hidden ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}