// Genre landing pages (/samples/<slug>): quiet on-site, built for Google.
// Each one lists packs whose `genres` include `tag`. A page only goes live
// once at least one real (non-bonus) release is tagged with it.
// Copy rules: we make compositions, not records; no triplets; no "dusty";
// don't claim specific instruments are in the packs (tags are per pack).
// Each page targets one main search (`keyword`) plus close variants.

export interface GenrePage {
  slug: string;
  tag: string;
  /** Main search this page targets */
  keyword: string;
  /** Giant decorative title in the hero */
  wordmark: string;
  /** The real <h1>, shown small above the giant title */
  h1: string;
  seoTitle: string;
  description: string;
  /** One or two lines under the title, in Chris's voice */
  manifesto: string;
  aboutHeading: string;
  /** Paragraphs for "About these samples" */
  about: string;
  faqs: { q: string; a: string }[];
  guides: { slug: string; title: string }[];
}

const G = {
  soul: { slug: "how-to-sample-soul-music", title: "How to sample soul music" },
  chop: { slug: "how-to-chop-a-sample", title: "How to chop a sample" },
  flip: { slug: "how-to-flip-a-sample", title: "How to flip a sample so it sounds like yours" },
  stems: { slug: "how-to-use-stems-when-you-sample", title: "How to use stems when you sample" },
  clearance: { slug: "sample-clearance", title: "Sample clearance: the complete guide" },
  royalty: { slug: "royalty-free-vs-pre-cleared-samples", title: "Royalty-free vs pre-cleared samples" },
  contentId: { slug: "content-id-and-samples", title: "Can you put a song with samples into Content ID?" },
};

const royaltyFreeFaq = (g: string) => ({
  q: `Are these ${g} samples royalty-free?`,
  a: `Yes. These ${g} samples are royalty-free and pre-cleared. They're original compositions, so you can use them in commercial releases, including major label releases and sync, without paying royalties or asking anyone's permission.`,
});

const commercialFaq = (g: string) => ({
  q: `Can I use these ${g} samples in a commercial release?`,
  a: `Yes. Anything you download as a member is licensed to you for life for commercial use, including beats you sell and sync placements. You never owe royalties or a credit.`,
});

const previewFaq = (g: string) => ({
  q: `Can I listen to the ${g} samples before I join?`,
  a: "Yes. You can preview every pack in the catalog for free. A membership lets you download the samples and their stems.",
});

export const GENRE_PAGES: GenrePage[] = [
  {
    slug: "vintage-soul",
    tag: "Vintage Soul",
    keyword: "vintage soul samples",
    wordmark: "Vintage Soul",
    h1: "Royalty-free vintage soul samples",
    seoTitle: "Vintage Soul Samples & Loops, Pre-Cleared | Soul Sample Club",
    description:
      "Royalty-free vintage soul samples and loops with full stems. Original 60s and 70s style soul compositions, pre-cleared for your releases.",
    manifesto:
      "Vintage soul samples that sound like they've been sitting in a basement for fifty years. We wrote them recently, and they're cleared for whatever you build with them.",
    aboutHeading: "Vintage soul samples, without the clearance",
    about: `Vintage soul is where most of us started sampling. Those 60s and 70s soul records had rich chords and loose, human playing, with a warmth you can't get from a preset. That's why old soul samples are still behind so much hip hop, from boom bap to the sample-heavy records of today.

The problem has always been clearance. Sampling a real soul record from 1972 means tracking down the label and the publisher, then usually giving away a share of your song on top of the fees. Most producers never get that far, and the beat stays on a hard drive.

So we took a different route. We write original soul compositions in that vintage style, played by real musicians, so you can sample them the way you would a record you dug up. Every one is royalty-free and pre-cleared for commercial releases, including major labels and sync.

Each sample pack comes with full stems, so you're not stuck with a finished mix. Use the full composition, or strip it back to one part and build around it. Every track lists its BPM and key.

A tip from me: don't just grab the first four bars. Listen all the way through. The best moment in a soul sample is often the two bars nobody else noticed.`,
    faqs: [
      royaltyFreeFaq("vintage soul"),
      { q: "Where can I find vintage soul samples that are already cleared?", a: "Every sample on this page is an original composition made for sampling, so it comes pre-cleared. You don't need to contact a label or publisher before releasing your song." },
      commercialFaq("vintage soul"),
      previewFaq("vintage soul"),
    ],
    guides: [G.soul, G.chop, G.clearance],
  },
  {
    slug: "psychedelic",
    tag: "Psychedelic",
    keyword: "psychedelic soul samples",
    wordmark: "Psychedelic",
    h1: "Royalty-free psychedelic soul samples",
    seoTitle: "Psychedelic Soul Samples & Loops, Pre-Cleared | SSC",
    description:
      "Royalty-free psychedelic soul samples and loops with full stems. Original psych soul compositions, pre-cleared for commercial releases.",
    manifesto: "Psychedelic soul samples from the side of soul that wandered off the map. Compositions with room to get lost in.",
    aboutHeading: "Psychedelic soul samples you can actually release",
    about: `Psychedelic soul is what happened when soul players started stretching out in the late 60s and 70s. Songs got longer and stranger, and arrangements started taking turns nobody saw coming.

For producers, psych soul samples are gold. The music tends to leave space, with long intros and drawn-out sections where the band just rides. Those are exactly the moments you want to sample, and they're the reason psych records are some of the most crate-dug in hip hop.

They're also expensive to clear, and many of the original labels are long gone. Our psychedelic soul samples are original compositions written in that spirit, so they're royalty-free and pre-cleared from the start.

Every psychedelic sample pack comes with full stems, so you can pull a single part out of the haze or keep the whole thing together. Pitch a psych sample down and it gets heavier. Filter it and it turns into a texture you can build a whole beat inside.`,
    faqs: [
      royaltyFreeFaq("psychedelic soul"),
      { q: "What makes psychedelic soul good for sampling?", a: "Psychedelic soul tends to have long, open sections and unusual sounds, which give you distinctive moments to sample that don't sound like every other soul record." },
      commercialFaq("psychedelic soul"),
      previewFaq("psychedelic"),
    ],
    guides: [G.flip, G.stems, G.clearance],
  },
  {
    slug: "gospel",
    tag: "Gospel",
    keyword: "gospel samples",
    wordmark: "Gospel",
    h1: "Royalty-free gospel samples",
    seoTitle: "Gospel Samples & Loops, Pre-Cleared | Soul Sample Club",
    description:
      "Royalty-free gospel samples and loops with full stems. Original gospel compositions for hip hop and soul, pre-cleared for your releases.",
    manifesto: "Gospel samples with chords that lift a room. Written to be sampled, and cleared before you press play.",
    aboutHeading: "Gospel samples for hip hop, cleared from day one",
    about: `Gospel samples have been behind some of the biggest moments in hip hop. The right gospel chord can make a beat feel like it means something before anyone's said a word, which is why producers keep going back to church music for samples.

It's also some of the hardest music to clear. Old gospel recordings often sit with small labels and tangled publishing, so sampling the real thing can take months, if it's possible at all.

Our gospel samples give you that feeling without the chase. They're original gospel compositions, played by real musicians, and every one is royalty-free and pre-cleared for commercial releases, including major labels and sync.

Each gospel sample pack comes with full stems, so you can use the whole composition or keep just one part and build your own arrangement around it.

Gospel harmony is full, so give your drums some room. A simple pattern and a lot of space is often all a gospel sample needs.`,
    faqs: [
      royaltyFreeFaq("gospel"),
      { q: "Why are gospel samples so popular in hip hop?", a: "Gospel chords and voices carry a lot of emotion in just a few bars, which gives a beat weight straight away. That makes gospel samples ideal to build a beat around." },
      commercialFaq("gospel"),
      previewFaq("gospel"),
    ],
    guides: [G.soul, G.stems, G.clearance],
  },
  {
    slug: "jazz",
    tag: "Jazz",
    keyword: "jazz samples",
    wordmark: "Jazz",
    h1: "Royalty-free jazz samples",
    seoTitle: "Jazz Samples & Loops for Hip Hop, Pre-Cleared | SSC",
    description:
      "Royalty-free jazz samples and loops with full stems. Original jazz and jazz-soul compositions for hip hop, pre-cleared for your releases.",
    manifesto: "Jazz samples with late-night harmony, played by people who know when to leave space.",
    aboutHeading: "Jazz samples for hip hop, without the clearance",
    about: `Jazz and hip hop go back a long way. Jazz samples brought rich harmony and playing that breathes, and a single chord change can carry a whole beat. That's why jazz samples sit under so many classic hip hop records.

Most of the jazz you'd want to sample is locked up in catalogs that are slow and expensive to clear. Our jazz samples are written for sampling from the start. They're original jazz and jazz-soul compositions, played by real musicians, and every one is royalty-free and pre-cleared for commercial releases.

Every jazz sample pack comes with full stems, which is where jazz really opens up. You can keep a single part and build a completely different piece around it, or use the whole group.

Jazz rewards patience. Listen for the moment the band settles into a groove, and start your sample there.`,
    faqs: [
      royaltyFreeFaq("jazz"),
      { q: "Are these jazz samples good for hip hop?", a: "Yes. They're written with sampling in mind, with open sections and rich chords that chop well under hip hop drums." },
      commercialFaq("jazz"),
      previewFaq("jazz"),
    ],
    guides: [G.chop, G.flip, G.clearance],
  },
  {
    slug: "funk",
    tag: "Funk",
    keyword: "funk samples",
    wordmark: "Funk",
    h1: "Royalty-free funk samples",
    seoTitle: "Funk Samples & Loops, Pre-Cleared | Soul Sample Club",
    description:
      "Royalty-free funk samples and loops with full stems. Original funk compositions with real grooves, pre-cleared for your releases.",
    manifesto: "Funk samples with grooves that won't sit still. Cleared and ready to flip.",
    aboutHeading: "Funk samples you can actually release",
    about: `Funk is where a lot of sampling began. The grooves of 70s funk bands built much of the foundation of hip hop, and funk samples still turn up under beats in every era since.

That history is also why funk samples are so hard to clear today. The most famous funk grooves have been sampled so often that their owners know exactly what they're worth.

Our funk samples are original compositions played by real musicians, so the groove is yours to use. Every one is royalty-free and pre-cleared for commercial releases, including major labels and sync.

Each funk sample pack comes with full stems, so you can take one part on its own or use the whole band.

Funk is all about the pocket. When you chop a funk sample, don't quantize the life out of it.`,
    faqs: [
      royaltyFreeFaq("funk"),
      { q: "Why is it hard to clear old funk samples?", a: "The most famous funk grooves have been sampled so many times that their owners charge a lot to license them, and some refuse. Original funk compositions made for sampling avoid that completely." },
      commercialFaq("funk"),
      previewFaq("funk"),
    ],
    guides: [G.chop, G.stems, G.clearance],
  },
  {
    slug: "r-and-b",
    tag: "R&B",
    keyword: "R&B samples",
    wordmark: "R&B",
    h1: "Royalty-free R&B samples",
    seoTitle: "R&B Samples & Loops, Pre-Cleared | Soul Sample Club",
    description:
      "Royalty-free R&B samples and loops with full stems. Smooth, soulful R&B compositions, pre-cleared for commercial releases.",
    manifesto: "R&B samples with smooth harmony and warm melodies, written for producers to flip into something new.",
    aboutHeading: "Soulful R&B samples, ready to release",
    about: `R&B sits right between soul and hip hop, and R&B samples have been flipped on both sides for decades. The harmony is smooth and the melodies stay with you, which makes them perfect for sampling.

Our R&B samples are original compositions, played by real musicians. Every one is royalty-free and pre-cleared, so you can build on them without worrying about who owns what, whether you're making hip hop or R&B.

Each R&B sample pack comes with full stems. R&B samples work well slowed down and pitched down for moodier beats, or sped up for something brighter.

Try pulling a single chord or phrase and building around it. R&B samples often shine brightest in small pieces.`,
    faqs: [
      royaltyFreeFaq("R&B"),
      { q: "Can I use these R&B samples in any genre?", a: "Yes. They're licensed for commercial use in any kind of music, with no royalties owed." },
      commercialFaq("R&B"),
      previewFaq("R&B"),
    ],
    guides: [G.flip, G.chop, G.clearance],
  },
  {
    slug: "lo-fi",
    tag: "Lo-Fi",
    keyword: "lo-fi samples",
    wordmark: "Lo-Fi",
    h1: "Royalty-free lo-fi samples",
    seoTitle: "Lo-Fi Samples & Loops, Pre-Cleared | Soul Sample Club",
    description:
      "Royalty-free lo-fi samples and loops with full stems. Relaxed soul compositions for lo-fi hip hop, pre-cleared for streaming releases.",
    manifesto: "Lo-fi samples with soft edges and slow grooves. Made for late nights and long sessions.",
    aboutHeading: "Lo-fi samples for beats that go on streaming",
    about: `Lo-fi hip hop lives on atmosphere. The best lo-fi beats are built on a sample that could play for hours without getting old.

If you release a lot of lo-fi music on streaming platforms, clearance matters more than people think. Distributors and platforms flag uncleared samples, and one claim can pull a track or redirect its earnings.

Our lo-fi samples are original soul compositions, played by real musicians and written with that relaxed feel in mind. Every one is royalty-free and pre-cleared for commercial releases.

Each lo-fi sample pack comes with full stems, so you can keep things minimal. A single part with the rest muted is often all a lo-fi beat needs.

Resist the urge to add too much. With lo-fi, what you leave out does half the work.`,
    faqs: [
      royaltyFreeFaq("lo-fi"),
      { q: "Can I release lo-fi beats made with these samples on streaming platforms?", a: "Yes. They're pre-cleared for commercial releases on any platform. Just don't register songs built on them in YouTube Content ID, because the samples are licensed to other members too." },
      commercialFaq("lo-fi"),
      previewFaq("lo-fi"),
    ],
    guides: [G.soul, G.stems, G.contentId],
  },
  {
    slug: "neo-soul",
    tag: "Neo-Soul",
    keyword: "neo soul samples",
    wordmark: "Neo-Soul",
    h1: "Royalty-free neo soul samples",
    seoTitle: "Neo Soul Samples & Loops, Pre-Cleared | Soul Sample Club",
    description:
      "Royalty-free neo soul samples and loops with full stems. Rich, modern soul compositions with jazz chords, pre-cleared for your releases.",
    manifesto: "Neo soul samples with jazz in the chords and a looser groove. Soul that sounds like now.",
    aboutHeading: "Neo soul samples with rich chords and room to breathe",
    about: `Neo soul took the warmth of classic soul and added jazz harmony and a looser, more modern feel. Neo soul chords are full of extensions, and the groove sits a little behind the beat.

That makes neo soul samples a gift for producers, because a single chord can carry a whole beat. Our neo soul samples are original compositions, played by real musicians, and every one is royalty-free and pre-cleared for commercial releases.

Each neo soul sample pack comes with full stems, so you can keep just the harmony as a bed and build your own groove on top, or use the full composition.

Neo soul is loose on purpose. If you chop a neo soul sample, keep some of that swing in your drums.`,
    faqs: [
      royaltyFreeFaq("neo soul"),
      { q: "What's the difference between neo soul and vintage soul samples?", a: "Vintage soul samples have the sound and feel of 60s and 70s soul. Neo soul samples are more modern, with richer jazz chords and a looser groove." },
      commercialFaq("neo soul"),
      previewFaq("neo soul"),
    ],
    guides: [G.flip, G.stems, G.clearance],
  },
  {
    slug: "japanese",
    tag: "Japanese",
    keyword: "Japanese soul samples",
    wordmark: "Japanese",
    h1: "Royalty-free Japanese soul samples",
    seoTitle: "Japanese Soul & City Pop Samples, Pre-Cleared | SSC",
    description:
      "Royalty-free Japanese soul, funk and city pop style samples with full stems. Original compositions, pre-cleared for commercial releases.",
    manifesto: "Japanese soul samples inspired by the music that came out of Japan in its golden era. Written by us, and cleared for you.",
    aboutHeading: "Japanese soul and city pop samples, cleared",
    about: `Japanese soul, funk and city pop have become some of the most sought-after sounds in sampling. The playing is precise and the arrangements are lush, and Japanese samples from the 70s and 80s have turned up in hip hop and electronic music all over the world.

They're also notoriously hard to clear. The catalogs sit with Japanese labels and publishers, and getting an answer from overseas can take a long time, if it comes at all. Plenty of great beats built on city pop samples never get released for that reason.

Our Japanese soul samples are original compositions inspired by that era, played by real musicians. Every one is royalty-free and pre-cleared for commercial releases, including major labels and sync.

Each pack comes with full stems. These arrangements reward close listening, and there's often a perfect sample hiding in the background parts.`,
    faqs: [
      royaltyFreeFaq("Japanese soul"),
      { q: "Are these actual Japanese records?", a: "No. They're original compositions inspired by Japanese soul, funk and city pop, which is why they're cleared for you to use." },
      commercialFaq("Japanese soul"),
      previewFaq("Japanese soul"),
    ],
    guides: [G.soul, G.flip, G.clearance],
  },
];

export function getGenrePage(slug: string): GenrePage | null {
  return GENRE_PAGES.find((g) => g.slug === slug) ?? null;
}
