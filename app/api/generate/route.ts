import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentGenerationRequest, BrandVoiceAnalysis, GeneratedContent, Industry } from "@/app/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Analyze brand voice from example content (supports text and images)
async function analyzeBrandVoice(examples: string[] | any[]): Promise<BrandVoiceAnalysis> {
  // Validate input
  if (!examples || !Array.isArray(examples) || examples.length === 0) {
    console.warn("No examples provided for brand voice analysis");
    return {
      tone: "professional",
      style: "clear and concise",
      terminology: [],
      structure: "standard"
    };
  }

  // Handle both legacy string array and new BrandVoiceExample format
  const processedExamples = examples
    .map((ex, i) => {
      if (typeof ex === 'string') {
        return { type: 'text', content: ex };
      }
      return ex;
    })
    .filter(ex => ex && (ex.content || ex.text)); // Filter out empty examples

  // Build message content with text and images
  const messageContent: any[] = [];
  
  let textPrompt = `Analyze the brand voice and writing style from these example content pieces. `;
  
  // Check if we have images
  const hasImages = processedExamples.some(ex => ex.type === 'image');
  
  if (hasImages) {
    textPrompt += `For images, analyze the visual style, color schemes, typography, layout, and overall design aesthetic. For text, analyze writing style, tone, terminology, and structure. `;
  }
  
  textPrompt += `Provide a detailed analysis in JSON format with:
- tone: The overall tone (e.g., "conversational", "professional", "data-driven")
- style: Writing style characteristics (e.g., "short paragraphs", "bullet points", "narrative")${hasImages ? ' and visual style (e.g., "minimalist", "bold colors", "modern typography")' : ''}
- terminology: Array of key terms and jargon used
- structure: How content is typically structured

Examples:`;

  messageContent.push({ type: "text", text: textPrompt });

  // Add examples (text or images or mixed)
  processedExamples.forEach((ex, i) => {
    if (!ex) {
      console.warn(`Skipping empty example ${i + 1}`);
      return;
    }

    // Handle image (with optional text)
    if ((ex.type === 'image' || ex.type === 'mixed') && ex.content) {
      try {
        // Extract base64 data (remove data URL prefix if present)
        let imageData = ex.content;
        if (imageData.includes(',')) {
          imageData = imageData.split(',')[1];
        } else if (imageData.startsWith('data:')) {
          imageData = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        }
        
        // Determine media type
        let mediaType = ex.mimeType || "image/png";
        if (!mediaType && ex.content.startsWith('data:')) {
          const match = ex.content.match(/data:([^;]+)/);
          if (match) mediaType = match[1];
        }

        // Add image
        messageContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: imageData
          }
        });
        
        // Add text description if provided
        const imageText = ex.textContent || '';
        if (imageText.trim()) {
          messageContent.push({ type: "text", text: `\nExample ${i + 1} (Image with description): ${imageText}\nAnalyze both the visual style, colors, typography, design elements, AND the writing style of the description.\n` });
        } else {
          messageContent.push({ type: "text", text: `\nExample ${i + 1} (Image): Analyze the visual style, colors, typography, and design elements.\n` });
        }
      } catch (error) {
        console.error(`Error processing image example ${i + 1}:`, error);
        // Fallback to text description
        messageContent.push({ type: "text", text: `\nExample ${i + 1} (Image upload failed, please try again):\n` });
      }
    }
    
    // Handle text content (always add if present, even if there's also an image)
    if (ex.type === 'text' || ex.type === 'mixed' || !ex.type) {
      const textContent = ex.type === 'mixed' ? (ex.textContent || ex.content) : ex.content;
      if (textContent && typeof textContent === 'string' && textContent.trim()) {
        messageContent.push({ type: "text", text: `\nExample ${i + 1}${ex.type === 'mixed' ? ' (Text description for image)' : ''}:\n${textContent}\n` });
      }
    }
  });

  messageContent.push({ type: "text", text: `\nRespond with ONLY valid JSON in this format:
{
  "tone": "...",
  "style": "...",
  "terminology": ["term1", "term2", ...],
  "structure": "..."
}` });

  try {
    // Use the latest available Claude model (must support vision for images)
    const model = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620";
    const message = await anthropic.messages.create({
      model: model,
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: messageContent
      }]
    });

    const content = message.content[0];
    if (content.type === "text") {
      let text = content.text.trim();
      // Try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        text = jsonMatch[1];
      }
      // Try to find JSON object in the text
      const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        text = jsonObjectMatch[0];
      }
      const analysis = JSON.parse(text);
      return analysis;
    }
  } catch (error) {
    console.error("Error analyzing brand voice:", error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  }

  // Fallback
  return {
    tone: "professional",
    style: "clear and concise",
    terminology: [],
    structure: "standard"
  };
}

// Generate content for a specific format
async function generateContentForFormat(
  topic: string,
  industry: Industry,
  format: string,
  brandVoice?: BrandVoiceAnalysis
): Promise<GeneratedContent | null> {
  const formatInstructions: Record<string, string> = {
    blog: "Write a comprehensive blog post (800-1200 words) that is SEO-optimized with a clear introduction, body sections, and conclusion.",
    linkedin: "Write 3 LinkedIn posts (varying angles: thought leadership, stats-focused, question-based). Each should be engaging and professional.",
    twitter: "Write 5 Twitter posts (bite-sized insights from the topic). Each should be concise, engaging, and under 280 characters.",
    "google-ads": "Write 3 Google Ad variations for A/B testing. Include headlines and descriptions following Google Ads best practices.",
    instagram: "Write 3 Instagram post captions with relevant hashtags. Each should be engaging, visually descriptive, and include a call-to-action.",
    facebook: "Write 3 Facebook posts with varying formats (text-only, link preview style, question-based). Each should encourage engagement.",
    email: "Write a professional email campaign with subject line, preheader text, and body content optimized for email marketing.",
    newsletter: "Write a newsletter-style content piece with a compelling subject line, introduction, main content sections, and a clear call-to-action."
  };

  let brandVoiceContext = "";
  if (brandVoice) {
    brandVoiceContext = `\n\nBrand Voice Guidelines:
- Tone: ${brandVoice.tone}
- Style: ${brandVoice.style}
- Key Terminology: ${brandVoice.terminology.join(", ")}
- Structure: ${brandVoice.structure}

Match this brand voice exactly in your writing.`;
  }

  const prompt = `You are a professional content writer creating marketing content for ${industry} companies.

Topic: ${topic}
Industry: ${industry}
Format: ${formatInstructions[format]}

${brandVoiceContext}

Generate high-quality, engaging content that:
1. Is tailored specifically for the ${industry} industry
2. Uses relevant examples and terminology from that industry
3. Provides real value to the target audience
4. ${brandVoice ? "Matches the brand voice guidelines above exactly" : "Uses a professional, engaging tone"}

${format === "blog" ? "Include a compelling title at the beginning." : ""}
${format === "linkedin" ? "Number each post (1, 2, 3) and clearly separate them." : ""}
${format === "twitter" ? "Number each tweet (1, 2, 3, 4, 5) and clearly separate them." : ""}
${format === "google-ads" ? "Format as: Headline 1 / Description 1, then Headline 2 / Description 2, etc." : ""}
${format === "instagram" ? "Number each caption (1, 2, 3) and include relevant hashtags. Make them visually descriptive." : ""}
${format === "facebook" ? "Number each post (1, 2, 3) and clearly separate them. Include engagement hooks." : ""}
${format === "email" ? "Format as: Subject Line / Preheader / Body Content" : ""}
${format === "newsletter" ? "Include: Subject Line / Introduction / Main Sections / Call-to-Action" : ""}

Generate the content now:`;

  try {
    // Use the latest available Claude model
    const model = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620";
    const message = await anthropic.messages.create({
      model: model,
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    const content = message.content[0];
    if (content.type === "text") {
      // Calculate a simple consistency score if brand voice exists
      let consistencyScore = undefined;
      if (brandVoice && brandVoice.terminology && brandVoice.terminology.length > 0) {
        // Simple heuristic: check if terminology appears in content
        const contentText = content.text.toLowerCase();
        const matchingTerms = brandVoice.terminology.filter(term => 
          contentText.includes(term.toLowerCase())
        ).length;
        consistencyScore = Math.min(95, 70 + (matchingTerms / brandVoice.terminology.length) * 25);
      } else if (brandVoice) {
        // If brand voice exists but no terminology, give a base score
        consistencyScore = 75;
      }

      return {
        format: format as any,
        content: content.text,
        consistencyScore
      };
    }
  } catch (error) {
    console.error(`Error generating ${format} content:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Full error for ${format}:`, {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    // Return a more helpful error message
    return {
      format: format as any,
      content: `Error generating ${format} content: ${errorMessage}. Please check your API key and try again.`
    };
  }
  
  // Fallback return
  return {
    format: format as any,
    content: `Error generating ${format} content. Please try again.`
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured. Please set it in your .env.local file." },
        { status: 500 }
      );
    }

    const body: ContentGenerationRequest = await request.json();
    const { topic, industry, formats, brandVoiceExamples } = body;

    // Support both new format (BrandVoiceExample[]) and legacy format (string[])
    let examplesToUse: any[] = [];
    if (brandVoiceExamples) {
      if (Array.isArray(brandVoiceExamples) && brandVoiceExamples.length > 0) {
        if (typeof brandVoiceExamples[0] === 'string') {
          // Legacy format: string array
          examplesToUse = (brandVoiceExamples as string[]).map(ex => ({ type: 'text', content: ex }));
        } else {
          // New format: BrandVoiceExample array
          examplesToUse = brandVoiceExamples as any[];
        }
      }
    }

    // If only brand voice analysis is requested (no formats), just analyze and return
    if (examplesToUse && examplesToUse.length > 0 && (!formats || formats.length === 0)) {
      const brandVoice = await analyzeBrandVoice(examplesToUse);
      return NextResponse.json({
        contents: [],
        brandVoiceAnalysis: brandVoice
      });
    }

    // Otherwise, validate required fields for content generation
    if (!topic || !industry || !formats || formats.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: topic, industry, and at least one format are required" },
        { status: 400 }
      );
    }

    // Analyze brand voice if examples provided
    let brandVoice: BrandVoiceAnalysis | undefined;
    if (examplesToUse && examplesToUse.length > 0) {
      brandVoice = await analyzeBrandVoice(examplesToUse);
    } else if (body.brandVoice) {
      brandVoice = body.brandVoice;
    }

    // Generate content for all requested formats
    const generationPromises = formats.map(format => 
      generateContentForFormat(topic, industry, format, brandVoice)
    );

    const results = await Promise.all(generationPromises);
    const contents = results.filter((content): content is GeneratedContent => content !== null);

    return NextResponse.json({
      contents,
      brandVoiceAnalysis: brandVoice
    });
  } catch (error) {
    console.error("Error in generate route:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Full error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      body: error instanceof Error ? undefined : error
    });
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

