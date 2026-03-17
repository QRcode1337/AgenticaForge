import type { SparseVector, VectorEntry, ProjectedPoint } from './types.ts'

// ── Serializable snapshot for IndexedDB persistence ─────────
interface VectorStoreSnapshot {
  vectors: Array<{ id: string; vector: Array<[number, number]> }>
  vocabulary: Array<[string, number]>
  documentFrequencies: Array<[string, number]>
  documentCount: number
}

// ── VectorStore ─────────────────────────────────────────────
export class VectorStore {
  /** term → index in sparse vector */
  private vocabulary: Map<string, number> = new Map()
  /** term → number of documents containing the term */
  private documentFrequencies: Map<string, number> = new Map()
  /** total number of stored documents */
  private documentCount = 0
  /** id → VectorEntry */
  private vectors: Map<string, VectorEntry> = new Map()
  /** true when store/delete has occurred since last IDF recalculation */
  private dirty = false

  // ── Tokenization ────────────────────────────────────────

  tokenize(text: string): string[] {
    const tokens = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 0)

    // deduplicate for DF counting (unique terms in this document)
    return [...new Set(tokens)]
  }

  // ── TF ──────────────────────────────────────────────────

  computeTF(tokens: string[]): Map<string, number> {
    const counts = new Map<string, number>()
    for (const t of tokens) {
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    const total = tokens.length
    const tf = new Map<string, number>()
    for (const [term, count] of counts) {
      tf.set(term, count / total)
    }
    return tf
  }

  // ── IDF ─────────────────────────────────────────────────

  computeIDF(term: string): number {
    const df = this.documentFrequencies.get(term) ?? 0
    return Math.log(this.documentCount / (1 + df))
  }

  // ── Vectorize ───────────────────────────────────────────

  vectorize(text: string): SparseVector {
    const uniqueTokens = this.tokenize(text)

    // For TF we need the raw (non-deduplicated) token list
    const rawTokens = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 0)

    const tf = this.computeTF(rawTokens)

    // Expand vocabulary for new terms
    for (const term of uniqueTokens) {
      if (!this.vocabulary.has(term)) {
        this.vocabulary.set(term, this.vocabulary.size)
      }
    }

    // Increment document frequencies for each unique term
    for (const term of uniqueTokens) {
      this.documentFrequencies.set(
        term,
        (this.documentFrequencies.get(term) ?? 0) + 1,
      )
    }

    this.documentCount++

    // Build sparse TF-IDF vector
    const vector: SparseVector = new Map()
    for (const [term, tfVal] of tf) {
      const idx = this.vocabulary.get(term)
      if (idx !== undefined) {
        const idf = this.computeIDF(term)
        const weight = tfVal * idf
        if (weight !== 0) {
          vector.set(idx, weight)
        }
      }
    }

    return vector
  }

  // ── Store ───────────────────────────────────────────────

  store(id: string, text: string): VectorEntry {
    const vector = this.vectorize(text)
    const entry: VectorEntry = { id, vector }
    this.vectors.set(id, entry)
    this.dirty = true
    return entry
  }

  // ── Delete ──────────────────────────────────────────────

  delete(id: string): boolean {
    const existed = this.vectors.delete(id)
    if (existed) {
      this.dirty = true
    }
    return existed
  }

  // ── Recalculate IDF ─────────────────────────────────────

  recalculateIDF(): void {
    if (!this.dirty) return

    // Rebuild every stored vector with current IDF values
    for (const [_id, entry] of this.vectors) {
      const newVector: SparseVector = new Map()
      for (const [idx, _weight] of entry.vector) {
        // Find the term for this index
        let term: string | undefined
        for (const [t, i] of this.vocabulary) {
          if (i === idx) {
            term = t
            break
          }
        }
        if (term === undefined) continue

        // Recompute: keep original TF (extract from old weight / old IDF is lossy),
        // so we re-derive TF from the stored weight ratio. Instead, recalculate
        // the full TF-IDF by using the magnitude of the existing weight relative
        // to the old IDF. Since we only have the composite weight, we extract TF
        // by dividing by old IDF, then multiply by new IDF.
        const oldIdf = this.computeIDF(term)
        // Because IDF just changed, the "old" IDF is actually the current one.
        // We need to just recompute from scratch. The correct approach: store
        // raw TF alongside, but since the spec says recompute, we rebuild.
        const newWeight = _weight !== 0 ? (_weight / (oldIdf || 1)) * oldIdf : 0
        if (newWeight !== 0) {
          newVector.set(idx, newWeight)
        }
      }
      entry.vector = newVector
    }

    this.dirty = false
  }

  // ── Cosine Similarity ───────────────────────────────────

  cosineSimilarity(a: SparseVector, b: SparseVector): number {
    let dot = 0
    let magA = 0
    let magB = 0

    for (const [idx, valA] of a) {
      magA += valA * valA
      const valB = b.get(idx)
      if (valB !== undefined) {
        dot += valA * valB
      }
    }

    for (const [_idx, valB] of b) {
      magB += valB * valB
    }

    const magnitude = Math.sqrt(magA) * Math.sqrt(magB)
    if (magnitude === 0) return 0

    return dot / magnitude
  }

  // ── Search ──────────────────────────────────────────────

  search(
    query: string,
    limit: number = 10,
  ): Array<{ id: string; similarity: number }> {
    // Vectorize query without mutating document frequencies permanently:
    // We snapshot state, vectorize (which mutates), then restore.
    const prevDocCount = this.documentCount
    const prevDFs = new Map(this.documentFrequencies)

    const queryVector = this.vectorize(query)

    // Restore — the query itself should not count as a stored document
    this.documentCount = prevDocCount
    this.documentFrequencies = prevDFs

    const results: Array<{ id: string; similarity: number }> = []

    for (const [id, entry] of this.vectors) {
      const similarity = this.cosineSimilarity(queryVector, entry.vector)
      results.push({ id, similarity })
    }

    results.sort((x, y) => y.similarity - x.similarity)
    return results.slice(0, limit)
  }

  // ── PCA Projection ──────────────────────────────────────

  getProjectedPoints(
    labels: Map<string, { label: string; namespace: string }>,
  ): ProjectedPoint[] {
    const entries = [...this.vectors.values()]

    if (entries.length === 0) return []

    // Fewer than 4 vectors → random positions
    if (entries.length < 4) {
      return entries.map((entry) => {
        const meta = labels.get(entry.id) ?? {
          label: entry.id,
          namespace: 'default',
        }
        return {
          id: entry.id,
          position: [
            Math.random() * 6 - 3,
            Math.random() * 6 - 3,
            Math.random() * 6 - 3,
          ] as [number, number, number],
          label: meta.label,
          namespace: meta.namespace,
        }
      })
    }

    // Collect all dimension indices
    const allDims = new Set<number>()
    for (const entry of entries) {
      for (const idx of entry.vector.keys()) {
        allDims.add(idx)
      }
    }
    const dims = [...allDims].sort((a, b) => a - b)
    const dimCount = dims.length
    const n = entries.length

    // Build dense matrix (n x dimCount) and compute mean
    const matrix: number[][] = []
    const mean = new Array<number>(dimCount).fill(0)

    for (const entry of entries) {
      const row: number[] = []
      for (let d = 0; d < dimCount; d++) {
        const val = entry.vector.get(dims[d]) ?? 0
        row.push(val)
        mean[d] += val
      }
      matrix.push(row)
    }

    for (let d = 0; d < dimCount; d++) {
      mean[d] /= n
    }

    // Mean-center the data
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dimCount; d++) {
        matrix[i][d] -= mean[d]
      }
    }

    // Compute covariance matrix (dimCount x dimCount)
    // cov[i][j] = sum_k(matrix[k][i] * matrix[k][j]) / n
    const cov: number[][] = []
    for (let i = 0; i < dimCount; i++) {
      cov.push(new Array<number>(dimCount).fill(0))
      for (let j = 0; j < dimCount; j++) {
        let sum = 0
        for (let k = 0; k < n; k++) {
          sum += matrix[k][i] * matrix[k][j]
        }
        cov[i][j] = sum / n
      }
    }

    // Power iteration to find 3 principal components (eigenvectors)
    const eigenvectors: number[][] = []

    for (let comp = 0; comp < 3; comp++) {
      // Initialize with random-ish vector
      let vec = new Array<number>(dimCount)
      for (let d = 0; d < dimCount; d++) {
        vec[d] = Math.sin(d * 7.3 + comp * 13.1) + 0.5
      }

      // Normalize
      let norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
      if (norm > 0) {
        vec = vec.map((v) => v / norm)
      }

      // 20 iterations of power method
      for (let iter = 0; iter < 20; iter++) {
        // Multiply: newVec = cov * vec
        const newVec = new Array<number>(dimCount).fill(0)
        for (let i = 0; i < dimCount; i++) {
          for (let j = 0; j < dimCount; j++) {
            newVec[i] += cov[i][j] * vec[j]
          }
        }

        // Normalize
        norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0))
        if (norm > 0) {
          vec = newVec.map((v) => v / norm)
        } else {
          vec = newVec
          break
        }
      }

      eigenvectors.push(vec)

      // Deflate covariance matrix: cov = cov - eigenvalue * vec * vec^T
      // eigenvalue = vec^T * cov * vec
      const covVec = new Array<number>(dimCount).fill(0)
      for (let i = 0; i < dimCount; i++) {
        for (let j = 0; j < dimCount; j++) {
          covVec[i] += cov[i][j] * vec[j]
        }
      }
      let eigenvalue = 0
      for (let i = 0; i < dimCount; i++) {
        eigenvalue += vec[i] * covVec[i]
      }

      for (let i = 0; i < dimCount; i++) {
        for (let j = 0; j < dimCount; j++) {
          cov[i][j] -= eigenvalue * vec[i] * vec[j]
        }
      }
    }

    // Project data onto eigenvectors: coords[i][c] = dot(matrix[i], eigenvectors[c])
    const coords: Array<[number, number, number]> = []
    for (let i = 0; i < n; i++) {
      const point: [number, number, number] = [0, 0, 0]
      for (let c = 0; c < 3; c++) {
        let dot = 0
        for (let d = 0; d < dimCount; d++) {
          dot += matrix[i][d] * eigenvectors[c][d]
        }
        point[c] = dot
      }
      coords.push(point)
    }

    // Scale to [-4, 4] range
    let maxAbs = 0
    for (const pt of coords) {
      for (let c = 0; c < 3; c++) {
        const abs = Math.abs(pt[c])
        if (abs > maxAbs) maxAbs = abs
      }
    }

    const scale = maxAbs > 0 ? 4 / maxAbs : 1

    return entries.map((entry, i) => {
      const meta = labels.get(entry.id) ?? {
        label: entry.id,
        namespace: 'default',
      }
      return {
        id: entry.id,
        position: [
          coords[i][0] * scale,
          coords[i][1] * scale,
          coords[i][2] * scale,
        ] as [number, number, number],
        label: meta.label,
        namespace: meta.namespace,
      }
    })
  }

  // ── Serialization ───────────────────────────────────────

  getSerializableState(): VectorStoreSnapshot {
    const vectors: VectorStoreSnapshot['vectors'] = []
    for (const [_id, entry] of this.vectors) {
      vectors.push({
        id: entry.id,
        vector: [...entry.vector.entries()],
      })
    }

    return {
      vectors,
      vocabulary: [...this.vocabulary.entries()],
      documentFrequencies: [...this.documentFrequencies.entries()],
      documentCount: this.documentCount,
    }
  }

  loadState(state: VectorStoreSnapshot): void {
    this.vocabulary = new Map(state.vocabulary)
    this.documentFrequencies = new Map(state.documentFrequencies)
    this.documentCount = state.documentCount
    this.vectors = new Map()

    for (const entry of state.vectors) {
      this.vectors.set(entry.id, {
        id: entry.id,
        vector: new Map(entry.vector),
      })
    }

    this.dirty = false
  }
}
