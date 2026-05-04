"use client";

import Script from "next/script";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

interface MetaPixelProps {
  /** SHA-256 hashed email for Advanced Matching (logged-in users only) */
  hashedEmail?: string | null;
}

export function MetaPixel({ hashedEmail }: MetaPixelProps) {
  if (!META_PIXEL_ID) return null;

  // Advanced matching object — only include em when we have a hashed email
  const advancedMatch = hashedEmail ? `{ em: '${hashedEmail}' }` : "{}";

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}', ${advancedMatch});
          var _pvId = 'pv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
          fbq('track', 'PageView', {}, { eventID: _pvId });
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
