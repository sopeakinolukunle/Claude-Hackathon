# Quick Setup Guide

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Get Your Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

## Step 3: Configure Environment Variables
Create a file named `.env.local` in the root directory:

```bash
# In content-studio directory
touch .env.local
```

Add your API key to `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

**Important**: Never commit `.env.local` to git! It's already in `.gitignore`.

## Step 4: Run the Development Server
```bash
npm run dev
```

## Step 5: Open in Browser
Navigate to [http://localhost:3000](http://localhost:3000)

## Testing the Application

1. **Basic Test (No Brand Voice)**:
   - Enter topic: "How AI is transforming fraud detection in banking"
   - Select industry: "FinTech"
   - Select formats: Blog Post, LinkedIn Posts
   - Click "Generate Content"
   - Wait 30-60 seconds

2. **With Brand Voice Calibration**:
   - Click "Calibrate Brand Voice"
   - Paste 2-3 examples of existing content
   - Click "Analyze Brand Voice"
   - Go back and generate content
   - Notice the brand consistency scores

## Troubleshooting

### "API key not configured" error
- Make sure `.env.local` exists in the `content-studio` directory
- Make sure the file contains: `ANTHROPIC_API_KEY=your_key_here`
- Restart the dev server after creating/modifying `.env.local`

### Content generation fails
- Check your API key is valid
- Check you have API credits/quota available
- Check the browser console for detailed error messages

### Brand voice analysis fails
- Make sure you provide at least 2 examples
- Examples should be substantial (at least a few sentences each)
- Try with different examples if it fails

## Next Steps for Demo

1. Prepare example content for brand voice calibration
2. Test with different industries and topics
3. Take screenshots/video of the workflow
4. Prepare your pitch deck highlighting:
   - The 17x speed improvement
   - Brand voice consistency
   - Multi-format generation
   - Industry personalization

