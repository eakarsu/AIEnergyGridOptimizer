require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

// parseAIJson - 3-strategy AI JSON response parser
// Strategy 1: direct JSON.parse
// Strategy 2: strip markdown code fences
// Strategy 3: brace/bracket-matching extraction
function parseAIJson(content) {
  if (content == null) throw new Error('parseAIJson: empty content');
  const raw = String(content).trim();

  try { return JSON.parse(raw); } catch (_) {}

  let cleaned = raw;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```[\s\S]*$/, '');
    try { return JSON.parse(cleaned.trim()); } catch (_) {}
  } else {
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      try { return JSON.parse(fenceMatch[1].trim()); } catch (_) {}
    }
  }

  const objStart = cleaned.indexOf('{');
  const arrStart = cleaned.indexOf('[');
  let start = -1, openCh, closeCh;
  if (objStart !== -1 && (arrStart === -1 || objStart < arrStart)) {
    start = objStart; openCh = '{'; closeCh = '}';
  } else if (arrStart !== -1) {
    start = arrStart; openCh = '['; closeCh = ']';
  }
  if (start === -1) throw new Error('parseAIJson: no JSON found');

  let depth = 0, inString = false, escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === openCh) depth++;
    else if (ch === closeCh) {
      depth--;
      if (depth === 0) return JSON.parse(cleaned.substring(start, i + 1));
    }
  }
  throw new Error('parseAIJson: unbalanced braces');
}

async function aiAnalyze(featureType, data, customPrompt) {
  const prompts = {
    load_forecasting: `You are an AI energy grid analyst. Analyze the following grid load data and provide:
1. Load trend analysis
2. Peak demand predictions for the next 24 hours
3. Recommendations for load balancing
4. Risk assessment for grid overload
5. Suggested actions for grid operators

Data: ${JSON.stringify(data)}
${customPrompt ? `Additional context: ${customPrompt}` : ''}

Provide a detailed, professional analysis with specific numbers and actionable recommendations.`,

    fault_detection: `You are an AI grid fault detection specialist. Analyze the following fault data and provide:
1. Root cause analysis
2. Severity assessment and impact radius
3. Cascading failure risk
4. Recommended immediate actions
5. Preventive measures for future incidents

Data: ${JSON.stringify(data)}
${customPrompt ? `Additional context: ${customPrompt}` : ''}

Provide specific technical recommendations with priority levels.`,

    smart_meters: `You are an AI smart meter analytics expert. Analyze the following meter data and provide:
1. Consumption pattern analysis
2. Anomaly detection results
3. Energy theft probability assessment
4. Demand-side management recommendations
5. Customer segmentation insights

Data: ${JSON.stringify(data)}
${customPrompt ? `Additional context: ${customPrompt}` : ''}

Provide detailed analytics with confidence scores.`,

    energy_trading: `You are an AI energy trading analyst. Analyze the following trading data and provide:
1. Market trend analysis
2. Price forecast for next trading period
3. Optimal buy/sell recommendations
4. Risk assessment for open positions
5. Arbitrage opportunities

Data: ${JSON.stringify(data)}
${customPrompt ? `Additional context: ${customPrompt}` : ''}

Provide specific trading recommendations with expected ROI.`,

    weather_impact: `You are an AI weather-energy impact analyst. Analyze the following weather impact data and provide:
1. Weather pattern impact on energy generation
2. Demand variation forecast based on weather
3. Renewable energy output predictions
4. Grid stability risk assessment
5. Recommended preparedness actions

Data: ${JSON.stringify(data)}
${customPrompt ? `Additional context: ${customPrompt}` : ''}

Provide specific forecasts with confidence intervals.`,

    maintenance_schedule: `You are an AI predictive maintenance specialist for energy grid infrastructure. Analyze the following maintenance data and provide:
1. Failure probability assessment for each asset
2. Optimal maintenance scheduling
3. Cost-benefit analysis of preventive vs reactive maintenance
4. Asset lifecycle predictions
5. Priority ranking for maintenance activities

Data: ${JSON.stringify(data)}
${customPrompt ? `Additional context: ${customPrompt}` : ''}

Provide specific schedules with risk scores and cost estimates.`
  };

  const prompt = prompts[featureType] || `Analyze this energy grid data and provide professional insights: ${JSON.stringify(data)}`;

  const startTime = Date.now();
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://api.example.com',
        'X-Title': 'AI Energy Grid Optimizer'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI assistant for energy grid management and optimization. Provide detailed, professional analysis with specific data points, metrics, and actionable recommendations. Format your response with clear sections using markdown headers (##), bullet points, and bold text for emphasis. Include numerical values and percentages where applicable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || 'No analysis available';
    const durationMs = Date.now() - startTime;

    // Attempt structured parse with 3-strategy parseAIJson; capture for caching
    let structured = null;
    try {
      structured = parseAIJson(content);
    } catch (_) {
      // not JSON; that's ok, content is markdown
    }

    return {
      success: true,
      analysis: content,
      structured,
      model: result.model || OPENROUTER_MODEL,
      usage: result.usage || {},
      durationMs,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('AI Analysis Error:', error.message);
    return {
      success: false,
      error: error.message,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { aiAnalyze, parseAIJson };
