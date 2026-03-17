import type { HNSWConfig, HNSWNode, SparseVector } from './types.ts'

// ── Serialized node shape for persistence ────────────────────
interface SerializedHNSWNode {
  id: string
  level: number
  connections: Array<[number, string[]]>
}

// ── Default configuration ────────────────────────────────────
const DEFAULT_M = 16
const DEFAULT_CONFIG: HNSWConfig = {
  M: DEFAULT_M,
  efConstruction: 200,
  efSearch: 50,
  mL: 1 / Math.LN2 * Math.log(DEFAULT_M),
}

const MAX_LEVEL = 15

export class HNSWIndex {
  private config: HNSWConfig
  private nodes: Map<string, HNSWNode> = new Map()
  private vectors: Map<string, SparseVector> = new Map()
  private entryPoint: string | null = null
  private maxLevel = 0

  constructor(config?: Partial<HNSWConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ── Private: random level assignment ─────────────────────────
  private randomLevel(): number {
    const raw = -Math.floor(Math.log(Math.random()) * this.config.mL)
    return Math.max(0, Math.min(raw, MAX_LEVEL))
  }

  // ── Private: cosine distance between sparse vectors ──────────
  private distance(a: SparseVector, b: SparseVector): number {
    let dot = 0
    let magA = 0
    let magB = 0

    for (const [dim, valA] of a) {
      magA += valA * valA
      const valB = b.get(dim)
      if (valB !== undefined) {
        dot += valA * valB
      }
    }

    for (const [, valB] of b) {
      magB += valB * valB
    }

    if (magA === 0 || magB === 0) return 1.0

    const cosine = dot / (Math.sqrt(magA) * Math.sqrt(magB))
    return 1 - cosine
  }

  // ── Private: beam search within a single layer ───────────────
  private searchLayer(
    query: SparseVector,
    entryId: string,
    ef: number,
    layer: number,
  ): string[] {
    const visited = new Set<string>([entryId])

    // candidates: sorted ascending by distance (nearest first)
    const entryDist = this.distance(query, this.getVector(entryId))
    const candidates: Array<{ id: string; dist: number }> = [
      { id: entryId, dist: entryDist },
    ]
    // result set: same structure, will keep up to ef nearest
    const results: Array<{ id: string; dist: number }> = [
      { id: entryId, dist: entryDist },
    ]

    while (candidates.length > 0) {
      // Take the nearest unprocessed candidate
      const nearest = candidates.shift()!

      // Furthest in result set
      const furthestResult = results[results.length - 1]!

      // If nearest candidate is further than worst result and we have enough, stop
      if (nearest.dist > furthestResult.dist && results.length >= ef) {
        break
      }

      // Explore neighbors at this layer
      const node = this.nodes.get(nearest.id)
      if (!node) continue

      const connections = node.connections.get(layer)
      if (!connections) continue

      for (const neighborId of connections) {
        if (visited.has(neighborId)) continue
        visited.add(neighborId)

        const neighborDist = this.distance(query, this.getVector(neighborId))
        const currentFurthest = results[results.length - 1]!

        if (results.length < ef || neighborDist < currentFurthest.dist) {
          // Insert into candidates (sorted ascending by distance)
          this.insertSorted(candidates, { id: neighborId, dist: neighborDist })
          // Insert into results (sorted ascending by distance)
          this.insertSorted(results, { id: neighborId, dist: neighborDist })

          // Trim results to ef
          if (results.length > ef) {
            results.pop()
          }
        }
      }
    }

    return results.map((r) => r.id)
  }

  // ── Private: insert into a sorted array (ascending by dist) ──
  private insertSorted(
    arr: Array<{ id: string; dist: number }>,
    item: { id: string; dist: number },
  ): void {
    let lo = 0
    let hi = arr.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (arr[mid]!.dist < item.dist) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }
    arr.splice(lo, 0, item)
  }

  // ── Private: get vector with fallback to empty ───────────────
  private getVector(id: string): SparseVector {
    return this.vectors.get(id) ?? new Map()
  }

  // ── Private: connect two nodes bidirectionally at a layer ────
  private connectBidirectional(
    aId: string,
    bId: string,
    layer: number,
  ): void {
    const aNode = this.nodes.get(aId)
    const bNode = this.nodes.get(bId)
    if (!aNode || !bNode) return

    // a -> b
    let aConns = aNode.connections.get(layer)
    if (!aConns) {
      aConns = new Set()
      aNode.connections.set(layer, aConns)
    }
    aConns.add(bId)

    // b -> a
    let bConns = bNode.connections.get(layer)
    if (!bConns) {
      bConns = new Set()
      bNode.connections.set(layer, bConns)
    }
    bConns.add(aId)
  }

  // ── Private: prune connections to keep at most M per layer ───
  private pruneConnections(
    nodeId: string,
    layer: number,
    query: SparseVector,
  ): void {
    const node = this.nodes.get(nodeId)
    if (!node) return

    const conns = node.connections.get(layer)
    if (!conns || conns.size <= this.config.M) return

    // Rank all connections by distance to the node's own vector
    const ranked: Array<{ id: string; dist: number }> = []
    for (const connId of conns) {
      ranked.push({
        id: connId,
        dist: this.distance(query, this.getVector(connId)),
      })
    }
    ranked.sort((a, b) => a.dist - b.dist)

    // Keep only M nearest
    const keep = new Set(ranked.slice(0, this.config.M).map((r) => r.id))
    const removed = ranked.slice(this.config.M).map((r) => r.id)

    node.connections.set(layer, keep)

    // Clean up reverse connections for removed neighbors
    for (const removedId of removed) {
      const removedNode = this.nodes.get(removedId)
      if (!removedNode) continue
      const reverseConns = removedNode.connections.get(layer)
      if (reverseConns) {
        reverseConns.delete(nodeId)
      }
    }
  }

  // ── Public: insert a vector into the index ───────────────────
  insert(id: string, vector: SparseVector): void {
    this.vectors.set(id, vector)

    const level = this.randomLevel()
    const node: HNSWNode = {
      id,
      level,
      connections: new Map(),
    }

    // Initialize empty connection sets for each layer
    for (let l = 0; l <= level; l++) {
      node.connections.set(l, new Set())
    }

    this.nodes.set(id, node)

    // First node becomes entry point
    if (this.entryPoint === null) {
      this.entryPoint = id
      this.maxLevel = level
      return
    }

    let currentId = this.entryPoint

    // Phase 1: Traverse from top layer down to (level + 1) using greedy search
    for (let l = this.maxLevel; l > level; l--) {
      const nearest = this.searchLayer(vector, currentId, 1, l)
      if (nearest.length > 0) {
        currentId = nearest[0]!
      }
    }

    // Phase 2: From min(level, maxLevel) down to 0, insert with efConstruction
    const insertTop = Math.min(level, this.maxLevel)
    for (let l = insertTop; l >= 0; l--) {
      const neighbors = this.searchLayer(
        vector,
        currentId,
        this.config.efConstruction,
        l,
      )

      // Connect to M nearest neighbors at this layer
      const toConnect = neighbors.slice(0, this.config.M)
      for (const neighborId of toConnect) {
        if (neighborId === id) continue
        this.connectBidirectional(id, neighborId, l)
      }

      // Prune over-connected neighbors
      for (const neighborId of toConnect) {
        if (neighborId === id) continue
        this.pruneConnections(
          neighborId,
          l,
          this.getVector(neighborId),
        )
      }

      // Use nearest found as entry for next layer down
      if (neighbors.length > 0) {
        currentId = neighbors[0]!
      }
    }

    // Update entry point if new node has higher level
    if (level > this.maxLevel) {
      this.entryPoint = id
      this.maxLevel = level
    }
  }

  // ── Public: search for k nearest neighbors ───────────────────
  search(
    query: SparseVector,
    k: number = 10,
  ): Array<{ id: string; distance: number }> {
    if (this.entryPoint === null || this.nodes.size === 0) {
      return []
    }

    let currentId = this.entryPoint

    // Phase 1: Greedy traverse from top layer down to layer 1
    for (let l = this.maxLevel; l > 0; l--) {
      const nearest = this.searchLayer(query, currentId, 1, l)
      if (nearest.length > 0) {
        currentId = nearest[0]!
      }
    }

    // Phase 2: Beam search at layer 0 with efSearch
    const ef = Math.max(this.config.efSearch, k)
    const candidates = this.searchLayer(query, currentId, ef, 0)

    // Return k nearest sorted by distance ascending
    const results: Array<{ id: string; distance: number }> = []
    for (const candidateId of candidates) {
      results.push({
        id: candidateId,
        distance: this.distance(query, this.getVector(candidateId)),
      })
    }

    results.sort((a, b) => a.distance - b.distance)
    return results.slice(0, k)
  }

  // ── Public: delete a node from the index ─────────────────────
  delete(id: string): void {
    const node = this.nodes.get(id)
    if (!node) return

    // Remove all connection references to this node
    for (const [layer, connections] of node.connections) {
      for (const neighborId of connections) {
        const neighbor = this.nodes.get(neighborId)
        if (!neighbor) continue
        const neighborConns = neighbor.connections.get(layer)
        if (neighborConns) {
          neighborConns.delete(id)
        }
      }
    }

    this.nodes.delete(id)
    this.vectors.delete(id)

    // Rebuild entry point and maxLevel if we deleted the entry point
    if (this.entryPoint === id) {
      if (this.nodes.size === 0) {
        this.entryPoint = null
        this.maxLevel = 0
        return
      }

      // Find node with highest level to be new entry point
      let bestId: string | null = null
      let bestLevel = -1
      for (const [nodeId, n] of this.nodes) {
        if (n.level > bestLevel) {
          bestLevel = n.level
          bestId = nodeId
        }
      }
      this.entryPoint = bestId
      this.maxLevel = bestLevel
    }
  }

  // ── Public: get total layer count ────────────────────────────
  getLayerCount(): number {
    return this.maxLevel + 1
  }

  // ── Public: get total node count ─────────────────────────────
  getNodeCount(): number {
    return this.nodes.size
  }

  // ── Serialization: export state for persistence ──────────────
  getSerializableState(): SerializedHNSWNode[] {
    const serialized: SerializedHNSWNode[] = []

    for (const [, node] of this.nodes) {
      const connections: Array<[number, string[]]> = []
      for (const [layer, ids] of node.connections) {
        connections.push([layer, [...ids]])
      }
      serialized.push({
        id: node.id,
        level: node.level,
        connections,
      })
    }

    return serialized
  }

  // ── Serialization: restore state from persistence ────────────
  loadState(
    state: SerializedHNSWNode[],
    vectors: Map<string, SparseVector>,
  ): void {
    this.nodes.clear()
    this.vectors = vectors
    this.entryPoint = null
    this.maxLevel = 0

    for (const serialized of state) {
      const connections = new Map<number, Set<string>>()
      for (const [layer, ids] of serialized.connections) {
        connections.set(layer, new Set(ids))
      }

      const node: HNSWNode = {
        id: serialized.id,
        level: serialized.level,
        connections,
      }

      this.nodes.set(node.id, node)

      // Track entry point as highest-level node
      if (node.level > this.maxLevel) {
        this.maxLevel = node.level
        this.entryPoint = node.id
      } else if (this.entryPoint === null) {
        this.entryPoint = node.id
      }
    }
  }
}
