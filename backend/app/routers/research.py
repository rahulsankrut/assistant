from fastapi import APIRouter, HTTPException
from typing import Dict
import google.generativeai as genai
from bs4 import BeautifulSoup
import httpx
import urllib.parse

router = APIRouter()

@router.get("/search-scholar")
async def search_scholar(query: str, start: int = 0):
    """Search Google Scholar for medical research papers"""
    try:
        # URL encode the search query
        encoded_query = urllib.parse.quote(query)
        url = f"https://scholar.google.com/scholar?q={encoded_query}&start={start}&hl=en"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')
        
        papers = []
        for result in soup.select('.gs_ri'):
            title_element = result.select_one('.gs_rt')
            authors_element = result.select_one('.gs_a')
            snippet_element = result.select_one('.gs_rs')
            citations_element = result.select_one('.gs_fl')

            if title_element:
                title = title_element.get_text()
                link = title_element.find('a')['href'] if title_element.find('a') else None
                
                paper = {
                    'title': title,
                    'link': link,
                    'authors': authors_element.get_text() if authors_element else None,
                    'snippet': snippet_element.get_text() if snippet_element else None,
                    'citations': citations_element.get_text() if citations_element else None
                }
                papers.append(paper)

        return {
            'papers': papers,
            'total_results': len(papers),
            'start': start
        }

    except Exception as e:
        print(f"Scholar search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/research-chat")
async def research_chat(request: Dict):
    try:
        message = request.get("message")
        history = request.get("history", [])
        
        messages = [
            {"role": "system", "content": """You are a medical research assistant AI. 
            Help users understand medical research papers and provide accurate information 
            from reliable sources. Always cite sources when possible and maintain academic 
            integrity in your responses. Use markdown formatting for better readability."""}
        ]
        
        # Add conversation history
        for msg in history:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
            
        # Add the current message
        messages.append({"role": "user", "content": message})
        
        # Get response from Gemini
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(
            str(messages),
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 1000,
            }
        )
        
        return {"response": response.text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))