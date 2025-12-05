import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { moviesAPI } from '@/api/services'
import api from '@/api/axios'
import { Search, Film, Plus, Loader2 } from 'lucide-react'

const OMDBMovieImporter = ({ onMovieImported }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [movieDetails, setMovieDetails] = useState(null)
  const [importForm, setImportForm] = useState({
    theater: '',
    theater_address: '',
    show_date: '',
    show_time: '10:00 AM',
    total_seats: 100,
    available_seats: 100,
    price: 200,
    featured: false
  })

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a movie name to search')
      return
    }

    setLoading(true)
    try {
      const response = await moviesAPI.searchMovies(searchQuery)
      setSearchResults(response || [])
    } catch (error) {
      console.error('OMDB search error:', error)
      alert('Failed to search movies. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMovieSelect = async (movie) => {
    setSelectedMovie(movie)
    setLoading(true)
    try {
      const details = await moviesAPI.getMovieDetailsFromAPI(movie.imdb_id)
      setMovieDetails(details)
      setShowDetails(true)
    } catch (error) {
      console.error('OMDB details error:', error)
      alert('Failed to fetch movie details')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!selectedMovie || !importForm.theater || !importForm.show_date) {
      alert('Please fill all required fields (Theater, Show Date)')
      return
    }

    setImporting(true)
    try {
      const response = await api.post('/movies/api/import', {
        imdbId: selectedMovie.imdb_id,
        ...importForm,
        show_date: new Date(importForm.show_date).toISOString()
      })

      const result = response.data
      
      if (result && result.success) {
        alert('Movie imported successfully!')
        setShowDetails(false)
        setSelectedMovie(null)
        setSearchQuery('')
        setSearchResults([])
        setImportForm({
          theater: '',
          theater_address: '',
          show_date: '',
          show_time: '10:00 AM',
          total_seats: 100,
          available_seats: 100,
          price: 200,
          featured: false
        })
        if (onMovieImported) onMovieImported()
      } else {
        alert(result.message || 'Failed to import movie')
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to import movie')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="w-5 h-5" />
          Import Movie from OMDB
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search for a movie (e.g., Avatar, Inception)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((movie) => (
              <div
                key={movie.imdb_id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => handleMovieSelect(movie)}
              >
                {movie.poster_url && (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-16 h-24 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold">{movie.title}</h4>
                  <p className="text-sm text-gray-600">{movie.year}</p>
                  <Badge variant="outline" className="mt-1">{movie.imdb_id}</Badge>
                </div>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Import
                </Button>
              </div>
            ))}
          </div>
        )}

        {showDetails && movieDetails && (
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Movie: {movieDetails.title}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  {movieDetails.poster_url && (
                    <img
                      src={movieDetails.poster_url}
                      alt={movieDetails.title}
                      className="w-32 h-48 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Year: {movieDetails.year}</p>
                      <p className="text-sm text-gray-600">Genre: {movieDetails.genre}</p>
                      <p className="text-sm text-gray-600">Director: {movieDetails.director}</p>
                      <p className="text-sm text-gray-600">Runtime: {movieDetails.runtime}</p>
                      {movieDetails.imdb_rating && (
                        <Badge className="mt-2">IMDB: {movieDetails.imdb_rating}/10</Badge>
                      )}
                    </div>
                    {movieDetails.plot && (
                      <p className="text-sm text-gray-700 mt-2">{movieDetails.plot}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium mb-1">Theater *</label>
                    <Input
                      value={importForm.theater}
                      onChange={(e) => setImportForm({ ...importForm, theater: e.target.value })}
                      placeholder="e.g., PVR Cinemas"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Theater Address</label>
                    <Input
                      value={importForm.theater_address}
                      onChange={(e) => setImportForm({ ...importForm, theater_address: e.target.value })}
                      placeholder="e.g., Phoenix Marketcity, Mumbai"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Show Date *</label>
                    <Input
                      type="date"
                      value={importForm.show_date}
                      onChange={(e) => setImportForm({ ...importForm, show_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Show Time</label>
                    <Input
                      value={importForm.show_time}
                      onChange={(e) => setImportForm({ ...importForm, show_time: e.target.value })}
                      placeholder="e.g., 10:00 AM"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Total Seats</label>
                    <Input
                      type="number"
                      value={importForm.total_seats}
                      onChange={(e) => setImportForm({ ...importForm, total_seats: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Available Seats</label>
                    <Input
                      type="number"
                      value={importForm.available_seats}
                      onChange={(e) => setImportForm({ ...importForm, available_seats: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Price (₹)</label>
                    <Input
                      type="number"
                      value={importForm.price}
                      onChange={(e) => setImportForm({ ...importForm, price: parseInt(e.target.value) || 200 })}
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={importForm.featured}
                        onChange={(e) => setImportForm({ ...importForm, featured: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">Featured Movie</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleImport} disabled={importing} className="flex-1">
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Import Movie
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setShowDetails(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}

export default OMDBMovieImporter

